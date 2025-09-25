const { generateAdminLiteToken, projectAdminLiteUser } = require('./utils/token')
const { verifyAdminPassword } = require('./utils/password')

const normalizeEmail = (value) => {
  if (!value) return ''
  return String(value).trim().toLowerCase()
}

const resolveScopedDependency = (scope, key) => {
  if (!scope || typeof scope.resolve !== 'function') return null
  try {
    return scope.resolve(key)
  } catch (error) {
    return null
  }
}

const resolveLogger = (scope) => resolveScopedDependency(scope, 'logger')
const resolveAuthService = (scope) => resolveScopedDependency(scope, 'authService')
const resolveUserService = (scope) => resolveScopedDependency(scope, 'userService')

const fallbackAuthenticateUser = async (email, password, userService, logger) => {
  if (!userService) return null

  let user
  try {
    user = await userService.retrieveByEmail(email, {
      select: ['id', 'email', 'first_name', 'last_name', 'role', 'password_hash', 'metadata', 'deleted_at'],
    })
  } catch (error) {
    const errorType = typeof error?.type === 'string' ? error.type.toLowerCase() : ''
    if (errorType === 'not_found') {
      return null
    }
    if (logger?.warn) {
      logger.warn('[admin-lite] login: fallback lookup failed for ' + email + ': ' + (error?.message || error))
    }
    return null
  }

  if (!user || user.deleted_at || typeof user.password_hash !== 'string' || !user.password_hash) {
    return null
  }

  let passwordsMatch = false
  try {
    passwordsMatch = await verifyAdminPassword(password, user.password_hash)
  } catch (error) {
    if (logger?.warn) {
      logger.warn('[admin-lite] login: fallback verification failed for ' + email + ': ' + (error?.message || error))
    }
    return null
  }

  if (!passwordsMatch) {
    return null
  }

  if (logger?.info) {
    logger.info('[admin-lite] login: legacy admin hash accepted for ' + email)
  }

  return user
}

const buildResponseUser = (user, logger) => {
  const projection = projectAdminLiteUser(user)
  if (!projection.ok) {
    if (logger?.error) {
      logger.error('[admin-lite] unable to project user profile: ' + projection.message)
    }
    return null
  }
  return projection.user
}

exports.createSession = async (req, res) => {
  res.setHeader('x-admin-lite-session', 'hit')

  const email = normalizeEmail(req.body?.email)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  const logger = resolveLogger(req.scope)
  const authService = resolveAuthService(req.scope)
  const userService = resolveUserService(req.scope)

  if (!authService || !userService) {
    if (logger?.error) {
      logger.error('[admin-lite] login: required services missing from scope')
    }
    res.status(500).json({ message: 'Authentication not configured' })
    return
  }

  let authResult
  try {
    authResult = await authService.authenticate(email, password)
  } catch (error) {
    if (logger?.error) {
      logger.error('[admin-lite] login: authentication threw for ' + email + ': ' + (error?.message || error))
    }
    res.status(500).json({ message: 'Authentication failed' })
    return
  }

  let baseUser = authResult && authResult.success ? authResult.user : null

  if (!baseUser) {
    baseUser = await fallbackAuthenticateUser(email, password, userService, logger)
  }

  if (!baseUser) {
    if (logger?.warn) {
      logger.warn('[admin-lite] login: invalid credentials for ' + email)
    }
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }
  if (baseUser.deleted_at) {
    if (logger?.warn) {
      logger.warn('[admin-lite] login: user soft-deleted ' + email)
    }
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  let user
  try {
    user = await userService.retrieve(baseUser.id)
  } catch (error) {
    if (logger?.error) {
      logger.error('[admin-lite] login: failed to load user profile for ' + email + ': ' + (error?.message || error))
    }
    res.status(500).json({ message: 'Authentication failed' })
    return
  }

  if (!user || user.deleted_at) {
    if (logger?.warn) {
      logger.warn('[admin-lite] login: user unavailable for ' + email)
    }
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  const responseUser = buildResponseUser(user, logger)
  if (!responseUser) {
    res.status(500).json({ message: 'Authentication failed' })
    return
  }

  const tokenResult = generateAdminLiteToken(user)
  if (!tokenResult.ok) {
    if (logger?.error) {
      logger.error('[admin-lite] login: token creation failed for ' + email + ': ' + (tokenResult.message || 'unknown error'))
    }
    res.status(500).json({ message: tokenResult.message || 'Authentication failed' })
    return
  }

  res.status(200).json({ token: tokenResult.token, user: responseUser, ttl: tokenResult.ttl })
}

exports.getSession = async (req, res) => {
  const logger = resolveLogger(req.scope)
  const userService = resolveUserService(req.scope)

  if (!userService) {
    if (logger?.error) {
      logger.error('[admin-lite] session: userService missing from scope')
    }
    res.status(500).json({ message: 'Admin Lite session unavailable' })
    return
  }

  const userId =
    req.liteStaff?.id || (typeof req.liteTokenPayload?.sub === 'string' ? req.liteTokenPayload.sub : null)

  if (!userId) {
    res.status(401).json({ message: 'Invalid Admin Lite token' })
    return
  }

  try {
    const user = await userService.retrieve(userId)

    if (!user || user.deleted_at) {
      res.status(401).json({ message: 'Session expired' })
      return
    }

    const responseUser = buildResponseUser(user, logger)
    if (!responseUser) {
      res.status(500).json({ message: 'Failed to project session user' })
      return
    }

    res.json({ authenticated: true, user: responseUser })
  } catch (error) {
    if (logger?.warn) {
      logger.warn('[admin-lite] session: unable to load user ' + userId + ': ' + (error?.message || error))
    }
    res.status(401).json({ message: 'Session invalid' })
  }
}

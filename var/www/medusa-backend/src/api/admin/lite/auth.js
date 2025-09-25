const { User } = require('@medusajs/medusa')
const { generateAdminLiteToken } = require('./utils/token')
const { verifyAdminPassword } = require('./utils/password')

const normalizeEmail = (value) => {
  if (!value) return ''
  return String(value).trim().toLowerCase()
}

const resolveManager = (scope) => {
  if (!scope || typeof scope.resolve !== 'function') return null
  try {
    return scope.resolve('manager')
  } catch (error) {
    return null
  }
}

const resolveLogger = (scope) => {
  if (!scope || typeof scope.resolve !== 'function') return null
  try {
    return scope.resolve('logger')
  } catch (error) {
    return null
  }
}

const loadAdminUser = async (manager, email) => {
  if (!manager || typeof manager.getRepository !== 'function') {
    throw new Error('Entity manager unavailable')
  }
  const repo = manager.getRepository(User)
  if (!repo || typeof repo.createQueryBuilder !== 'function') {
    throw new Error('User repository unavailable')
  }

  const qb = repo.createQueryBuilder('u')
  qb.where('LOWER(u.email) = :email', { email })
  qb.addSelect('u.password_hash')
  return await qb.getOne()
}

const buildTokenPayloadSource = (user) => {
  if (!user || typeof user !== 'object') return null
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role || 'admin',
    metadata: user.metadata,
  }
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
  const manager = resolveManager(req.scope)

  let user
  try {
    user = await loadAdminUser(manager, email)
  } catch (error) {
    if (logger?.error) {
      logger.error('[admin-lite] login: admin lookup failed for ' + email + ': ' + (error?.message || error))
    }
    res.status(500).json({ message: 'Authentication failed' })
    return
  }

  if (!user) {
    if (logger?.warn) {
      logger.warn('[admin-lite] login: user not found for ' + email)
    }
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  if (user.deleted_at) {
    if (logger?.warn) {
      logger.warn('[admin-lite] login: user soft-deleted ' + email)
    }
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  const hash = typeof user.password_hash === 'string' ? user.password_hash : ''
  if (!hash) {
    if (logger?.error) {
      logger.error('[admin-lite] login: password hash missing for ' + email)
    }
    res.status(500).json({ message: 'Authentication failed' })
    return
  }

  let ok = false
  try {
    ok = await verifyAdminPassword(password, hash)
  } catch (error) {
    ok = false
  }

  if (!ok) {
    if (logger?.warn) {
      logger.warn('[admin-lite] login: password mismatch for ' + email)
    }
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  const tokenSource = buildTokenPayloadSource(user)
  const tokenResult = generateAdminLiteToken(tokenSource)
  if (!tokenResult.ok) {
    if (logger?.error) {
      logger.error('[admin-lite] login: token creation failed for ' + email + ': ' + (tokenResult.message || 'unknown error'))
    }
    res.status(500).json({ message: tokenResult.message || 'Authentication failed' })
    return
  }

  res.status(200).json({ token: tokenResult.token, user: tokenResult.user })
}

exports.getSession = async (req, res) => {
  res.json({ authenticated: true, user: req.liteStaff || null })
}

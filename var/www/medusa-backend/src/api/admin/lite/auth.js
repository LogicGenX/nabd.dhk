const { User } = require('@medusajs/medusa')
const { generateAdminLiteToken } = require('./utils/token')
const { verifyAdminPassword } = require('./utils/password')

const findUserCaseInsensitive = async (repo, email) => {
  if (!repo || typeof repo.findOne !== 'function') return null
  const normalized = (email || '').trim().toLowerCase()
  if (!normalized) return null

  try {
    const direct = await repo.findOne({ where: { email: normalized } })
    if (direct) return direct
  } catch (error) {
    // ignore lookup errors and fallback to case-insensitive search
  }

  if (typeof repo.createQueryBuilder === 'function') {
    try {
      const qb = repo.createQueryBuilder('u')
      qb.where('LOWER(u.email) = :email', { email: normalized })
      const user = await qb.getOne()
      if (user) return user
    } catch (error) {
      // ignore query builder errors and fallback to null
    }
  }

  return null
}

const authenticateAdmin = async (scope, email, password) => {
  if (!scope || typeof scope.resolve !== 'function') return null
  const manager = scope.resolve('manager')
  const authService = scope.resolve('authService')
  if (!manager || !authService) return null

  try {
    const result = await manager.transaction(async (transactionManager) => {
      return await authService.withTransaction(transactionManager).authenticate(email, password)
    })
    if (!result || result.success === false) return null

    const user = result && result.user ? result.user : result
    if (!user || typeof user !== 'object') return null

    const hasIdentifier = [user.id, user._id].some((value) => typeof value === 'string' && value.trim())
    const emailCandidate = typeof user.email === 'string' ? user.email.trim() : ''
    if (!hasIdentifier || !emailCandidate) return null

    const tokenResult = generateAdminLiteToken(user)
    if (!tokenResult.ok) {
      const error = new Error(tokenResult.message || 'Admin Lite token creation failed')
      error.code = 'ADMIN_LITE_TOKEN_ERROR'
      throw error
    }

    return { token: tokenResult.token, user: tokenResult.user }
  } catch (error) {
    if (isUnauthorizedError(error)) return null
    throw error
  }
}

const isUnauthorizedError = (error) => {
  if (!error || typeof error !== 'object') return false
  const statusCandidates = [error.status, error.statusCode, error.httpStatus, error.status_code]
  if (statusCandidates.some((candidate) => Number(candidate) === 401)) return true
  if (typeof error.getStatusCode === 'function') {
    try {
      if (Number(error.getStatusCode()) === 401) return true
    } catch (ignored) {
      // ignore status accessor errors
    }
  }
  const codeCandidates = [error.code, error.type, error.name]
    .filter((value) => typeof value === 'string')
    .map((value) => value.toLowerCase())
  if (codeCandidates.some((value) => value.includes('unauthorized') || value.includes('not_allowed'))) {
    return true
  }
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : ''
  if (message.includes('invalid') && message.includes('credential')) return true
  if (message.includes('invalid') && message.includes('password')) return true
  return false
}

exports.createSession = async (req, res) => {
  res.setHeader('x-admin-lite-session', 'hit')

  console.log('[admin-lite] /session body', {
    hasBody: !!req.body,
    keys: Object.keys(req.body || {}),
    email: req.body?.email,
  })

  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  const logger = req.scope && req.scope.resolve ? req.scope.resolve('logger') : null

  try {
    const result = await authenticateAdmin(req.scope, email, password)
    if (result) {
      res.status(200).json(result)
      return
    }
  } catch (error) {
    if (logger?.error) {
      const message = error?.message || error
      logger.error('[admin-lite] authService.authenticate error: ' + message)
    }
  }

  try {
    const manager = req.scope && req.scope.resolve ? req.scope.resolve('manager') : null
    if (!manager || typeof manager.getRepository !== 'function') {
      if (logger?.warn) logger.warn('[admin-lite] fallback: no entity manager on req.scope')
      res.status(500).json({ message: 'Internal auth setup error (no manager)' })
      return
    }

    const repo = manager.getRepository(User)
    const user = await findUserCaseInsensitive(repo, email)
    if (!user) {
      if (logger?.warn) logger.warn(`[admin-lite] fallback: user not found for ${email}`)
      res.status(401).send('Invalid credentials')
      return
    }

    if (user.deleted_at) {
      if (logger?.warn) logger.warn(`[admin-lite] fallback: user soft-deleted ${email}`)
      res.status(401).send('Invalid credentials')
      return
    }

    console.log('[admin-lite] fallback verifying user', {
      email,
      hashPreview: (user.password_hash || '').slice(0, 16),
      hashLength: (user.password_hash || '').length,
    })

    const ok = await verifyAdminPassword(password, user.password_hash || '')

    console.log('[admin-lite] fallback verify result', { email, ok })
    if (!ok) {
      if (logger?.warn) logger.warn(`[admin-lite] fallback: password mismatch for ${email}`)
      res.status(401).send('Invalid credentials')
      return
    }

    const fallbackName = `${user.first_name ?? 'Admin'} ${user.last_name ?? ''}`.trim()
    const tokenResult = generateAdminLiteToken({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role || 'admin',
      metadata: user.metadata,
      name: fallbackName,
    })

    if (!tokenResult.ok) {
      if (logger && logger.error) {
        logger.error('Admin Lite fallback token creation failed: ' + tokenResult.message)
      }
      res.status(500).json({ message: tokenResult.message })
      return
    }

    res.status(200).json({ token: tokenResult.token, user: tokenResult.user })
  } catch (error) {
    if (logger && logger.error) logger.error('Admin Lite fallback login failed: ' + error.message)
    res.status(500).json({ message: 'Authentication failed' })
  }
}

exports.getSession = async (req, res) => {
  res.json({ authenticated: true, user: req.liteStaff || null })
}

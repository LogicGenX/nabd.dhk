const bcrypt = require('bcryptjs')
const { User } = require('@medusajs/medusa')
const { generateAdminLiteToken } = require('./utils/token')

const authenticateAdmin = async (scope, email, password) => {
  const manager = scope.resolve('manager')
  const authService = scope.resolve('authService')
  return await manager.transaction(async (transactionManager) => {
    return await authService.withTransaction(transactionManager).authenticate(email, password)
  })
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
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email : ''
  const email = String(rawEmail || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  const logger = req.scope && req.scope.resolve ? req.scope.resolve('logger') : null

  let result = null
  let authError = null
  try {
    result = await authenticateAdmin(req.scope, email, password)
  } catch (error) {
    authError = error
  }

  if (result && result.success && result.user) {
    const tokenResult = generateAdminLiteToken(result.user)
    if (!tokenResult.ok) {
      if (logger && logger.error) {
        logger.error('Admin Lite token creation failed: ' + tokenResult.message)
      }
      res.status(500).json({ message: tokenResult.message })
      return
    }
    res.status(200).json({ token: tokenResult.token, user: tokenResult.user })
    return
  }

  const shouldFallback = authError ? isUnauthorizedError(authError) : true
  if (authError && !shouldFallback) {
    if (logger && logger.error) logger.error('Admin Lite login failed: ' + authError.message)
    res.status(500).json({ message: 'Authentication failed' })
    return
  }

  try {
    const manager = req.scope && req.scope.resolve ? req.scope.resolve('manager') : null
    if (!manager || typeof manager.getRepository !== 'function') {
      throw new Error('Entity manager unavailable for fallback authentication')
    }
    const userRepo = manager.getRepository(User)
    let user = await userRepo.findOne({ where: { email } })
    const trimmedRawEmail = typeof rawEmail === 'string' ? rawEmail.trim() : ''
    if (!user && trimmedRawEmail && trimmedRawEmail !== email) {
      user = await userRepo.findOne({ where: { email: trimmedRawEmail } })
    }
    if (!user || user.deleted_at) {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }
    const ok = await bcrypt.compare(password, user.password_hash || '')
    if (!ok) {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }
    const fallbackUser = {
      id: user.id,
      email: user.email,
      first_name:
        typeof user.first_name === 'string' && user.first_name.trim() ? user.first_name.trim() : null,
      last_name: typeof user.last_name === 'string' && user.last_name.trim() ? user.last_name.trim() : null,
      role: user.role || 'admin',
      metadata: user.metadata,
    }
    const tokenResult = generateAdminLiteToken(fallbackUser)
    if (!tokenResult.ok) {
      if (logger && logger.error) logger.error('Admin Lite token creation failed: ' + tokenResult.message)
      res.status(500).json({ message: tokenResult.message })
      return
    }
    res.status(200).json({ token: tokenResult.token, user: tokenResult.user })
    return
  } catch (error) {
    if (logger && logger.error) logger.error('Admin Lite fallback login failed: ' + error.message)
    res.status(500).json({ message: 'Authentication failed' })
  }
}

exports.getSession = async (req, res) => {
  res.json({ authenticated: true, user: req.liteStaff || null })
}

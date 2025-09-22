const { createAdminLiteToken } = require('./utils/token')

const sanitizeString = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const authenticateAdmin = async (scope, email, password) => {
  const manager = scope.resolve('manager')
  const authService = scope.resolve('authService')
  return await manager.transaction(async (transactionManager) => {
    return await authService.withTransaction(transactionManager).authenticate(email, password)
  })
}

exports.createSession = async (req, res) => {
  const email = sanitizeString(req.body && req.body.email)
  const password =
    typeof req.body === 'object' &&
    req.body !== null &&
    typeof req.body.password === 'string'
      ? req.body.password
      : ''
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  let result
  try {
    result = await authenticateAdmin(req.scope, email, password)
  } catch (error) {
    const logger = req.scope && req.scope.resolve ? req.scope.resolve('logger') : null
    if (logger && logger.error) logger.error('Admin Lite login failed: ' + error.message)
    res.status(500).json({ message: 'Authentication failed' })
    return
  }

  if (!result || !result.success || !result.user) {
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  const tokenResult = createAdminLiteToken(result.user)
  if (!tokenResult.ok) {
    const logger = req.scope && req.scope.resolve ? req.scope.resolve('logger') : null
    if (logger && logger.error) logger.error('Admin Lite token creation failed: ' + tokenResult.message)
    res.status(500).json({ message: tokenResult.message })
    return
  }

  res.json({ token: tokenResult.token, user: tokenResult.user })
}

exports.getSession = async (req, res) => {
  res.json({ authenticated: true, user: req.liteStaff || null })
}

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

exports.createSession = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
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
    try {
      const manager = req.scope && req.scope.resolve ? req.scope.resolve('manager') : null
      if (!manager || typeof manager.getRepository !== 'function') {
        throw new Error('Entity manager unavailable for fallback authentication')
      }
      const userRepo = manager.getRepository(User)
      const user = await userRepo.findOne({ where: { email } })
      if (!user || user.deleted_at) {
        res.status(401).json({ message: 'Invalid credentials' })
        return
      }
      const ok = await bcrypt.compare(password, user.password_hash)
      if (!ok) {
        res.status(401).json({ message: 'Invalid credentials' })
        return
      }
      const fallbackUser = {
        id: user.id,
        email: user.email,
        first_name:
          typeof user.first_name === 'string' && user.first_name.trim() ? user.first_name : 'Admin',
        last_name: typeof user.last_name === 'string' ? user.last_name : '',
        role: user.role || 'admin',
        metadata: user.metadata,
      }
      const tokenResult = generateAdminLiteToken(fallbackUser)
      if (!tokenResult.ok) {
        const logger = req.scope && req.scope.resolve ? req.scope.resolve('logger') : null
        if (logger && logger.error) logger.error('Admin Lite token creation failed: ' + tokenResult.message)
        res.status(500).json({ message: tokenResult.message })
        return
      }
      res.status(200).json({ token: tokenResult.token, user: tokenResult.user })
      return
    } catch (error) {
      const logger = req.scope && req.scope.resolve ? req.scope.resolve('logger') : null
      if (logger && logger.error) logger.error('Admin Lite fallback login failed: ' + error.message)
      res.status(500).json({ message: 'Authentication failed' })
      return
    }
  }

  const tokenResult = generateAdminLiteToken(result.user)
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

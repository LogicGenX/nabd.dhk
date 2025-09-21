const jwt = require('jsonwebtoken')

const normalizeOrigin = (value) => value.toLowerCase().replace(/\/+$/, '')
const escapeRegex = (value) => value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')

const buildAllowedOriginMatchers = (raw) => {
  if (!raw) return []

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const normalized = normalizeOrigin(value)
      if (!normalized) return null
      if (!normalized.includes('*')) {
        return { value: normalized, test: (candidate) => candidate === normalized }
      }
      const pattern = '^' + normalized.split('*').map(escapeRegex).join('.*') + '$'
      const regex = new RegExp(pattern)
      return { value: normalized, test: (candidate) => regex.test(candidate) }
    })
    .filter(Boolean)
}

let cachedAllowedOrigins = buildAllowedOriginMatchers(process.env.ADMIN_LITE_ALLOWED_ORIGINS || '')
let cachedAllowedOriginsRaw = process.env.ADMIN_LITE_ALLOWED_ORIGINS || ''

const getAllowedOrigins = () => {
  const raw = process.env.ADMIN_LITE_ALLOWED_ORIGINS || ''
  if (raw !== cachedAllowedOriginsRaw) {
    cachedAllowedOrigins = buildAllowedOriginMatchers(raw)
    cachedAllowedOriginsRaw = raw
  }
  return cachedAllowedOrigins
}

const matchesAllowedOrigin = (allowedOrigins, value) => {
  if (!value) return false

  const normalized = normalizeOrigin(value)
  if (!normalized) return false

  for (const entry of allowedOrigins) {
    if (entry.test(normalized)) return true
    if (!normalized.includes('://')) {
      const httpsCandidate = normalizeOrigin('https://' + normalized)
      if (entry.test(httpsCandidate)) return true
      const httpCandidate = normalizeOrigin('http://' + normalized)
      if (entry.test(httpCandidate)) return true
    }
  }

  return false
}

module.exports = (req, res, next) => {
  const secret = process.env.ADMIN_LITE_JWT_SECRET
  if (!secret) {
    const logger = req.scope && req.scope.resolve ? req.scope.resolve('logger') : null
    if (logger && logger.error) logger.error('Admin Lite JWT secret missing')
    return res.status(500).json({ message: 'Admin Lite token not configured' })
  }
  const authHeader = req.get('authorization') || ''
  let token = null
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim()
  }
  if (!token) {
    const alt = req.get('x-admin-lite-token')
    if (alt) token = alt.trim()
  }
  if (!token) {
    return res.status(401).json({ message: 'Missing Admin Lite token' })
  }
  const allowedOrigins = getAllowedOrigins()
  if (allowedOrigins.length) {
    const originCandidates = [
      req.get('origin'),
      req.get('x-forwarded-origin'),
      req.get('x-forwarded-host'),
      req.get('host'),
    ].filter(Boolean)

    if (
      originCandidates.length &&
      !originCandidates.some((candidate) => matchesAllowedOrigin(allowedOrigins, candidate))
    ) {
      return res.status(403).json({ message: 'Origin not allowed' })
    }
  }
  const verifyOptions = {}
  const audience = process.env.ADMIN_LITE_JWT_AUDIENCE
  if (audience) verifyOptions.audience = audience
  const issuer = process.env.ADMIN_LITE_JWT_ISSUER
  if (issuer) verifyOptions.issuer = issuer
  try {
    const payload = jwt.verify(token, secret, verifyOptions)
    req.liteStaff = {
      id: payload.sub || payload.id || null,
      email: payload.email,
      name: payload.name,
      role: payload.role || 'staff',
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    }
    req.liteTokenPayload = payload
  } catch (error) {
    const logger = req.scope && req.scope.resolve ? req.scope.resolve('logger') : null

    if (logger && logger.warn) logger.warn('Admin Lite auth failed: ' + error.message)
    return res.status(401).json({ message: 'Invalid Admin Lite token' })
  }
  return next()
}


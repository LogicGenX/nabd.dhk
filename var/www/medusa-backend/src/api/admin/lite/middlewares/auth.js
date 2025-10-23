const jwt = require('jsonwebtoken')
const { resolveSecret, resolveSecretCandidates } = require('../utils/token')

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

const isLocalOrigin = (value) => {
  if (!value) return false
  const normalized = normalizeOrigin(value)
  if (!normalized) return false
  if (/^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return true
  const withHttp = normalized.includes('://') ? normalized : 'http://' + normalized
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/.test(withHttp)
}

const resolveLogger = (req, fallback = null) => {
  if (req.scope && typeof req.scope.resolve === 'function') {
    try {
      return req.scope.resolve('logger')
    } catch (error) {
      // ignore
    }
  }
  return fallback
}

module.exports = (req, res, next) => {
  const secrets = resolveSecretCandidates()
  if (!secrets.length) {
    const logger = resolveLogger(req)
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
    const logger = resolveLogger(req, console)
    if (logger && logger.warn) logger.warn('[admin-lite] auth: missing bearer token for ' + (req.originalUrl || req.url))
    return res.status(401).json({ message: 'Missing Admin Lite token' })
  }
  const allowedOrigins = getAllowedOrigins()
  const isDevEnvironment = (process.env.NODE_ENV || '').toLowerCase() !== 'production'
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
      if (isDevEnvironment && originCandidates.some(isLocalOrigin)) {
        return next()
      }
      const logger = resolveLogger(req, console)
      if (logger && logger.warn) logger.warn('[admin-lite] auth: origin not allowed', { candidates: originCandidates, allowed: allowedOrigins.map((o) => o.value) })
      return res.status(403).json({ message: 'Origin not allowed' })
    }
  }
  const verifyOptions = {}
  const audience = process.env.ADMIN_LITE_JWT_AUDIENCE
  if (audience) verifyOptions.audience = audience
  const issuer = process.env.ADMIN_LITE_JWT_ISSUER
  if (issuer) verifyOptions.issuer = issuer
  let payload = null
  let lastError = null
  let audienceWarning = null

  const tryVerify = (secret) => {
    try {
      return { payload: jwt.verify(token, secret, verifyOptions) }
    } catch (error) {
      if (
        (verifyOptions.audience || verifyOptions.issuer) &&
        error &&
        typeof error.message === 'string' &&
        (error.message.includes('audience') || error.message.includes('issuer'))
      ) {
        try {
          const relaxedPayload = jwt.verify(token, secret)
          return { payload: relaxedPayload, warning: error.message }
        } catch (secondary) {
          return { error: secondary }
        }
      }
      return { error }
    }
  }

  for (const secret of secrets) {
    const result = tryVerify(secret)
    if (result.payload) {
      payload = result.payload
      audienceWarning = result.warning || null
      break
    }
    lastError = result.error
  }

  if (!payload) {
    const logger = resolveLogger(req)
    if (logger && logger.warn) logger.warn('Admin Lite auth failed: ' + (lastError?.message || 'invalid token'))
    const fallbackLogger = resolveLogger(req, console)
    if (fallbackLogger && fallbackLogger.warn) fallbackLogger.warn('[admin-lite] auth failed: ' + (lastError?.message || 'invalid token'))
    return res.status(401).json({ message: 'Invalid Admin Lite token' })
  }

  req.liteStaff = {
    id: payload.sub || payload.id || null,
    email: payload.email,
    first_name: typeof payload.first_name === 'string' ? payload.first_name : null,
    last_name: typeof payload.last_name === 'string' ? payload.last_name : null,
    name: payload.name,
    role: payload.role || 'staff',
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  }
  req.liteTokenPayload = payload
  if (audienceWarning) {
    const logger = resolveLogger(req)
    if (logger && logger.warn) logger.warn('[admin-lite] token audience/issuer mismatch: ' + audienceWarning)
  }
  return next()
}


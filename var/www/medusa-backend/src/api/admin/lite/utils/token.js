const jwt = require('jsonwebtoken')

const DAY_IN_SECONDS = 60 * 60 * 24

const cleanEnv = (value) => {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const resolveSecret = () => {
  const candidates = [process.env.ADMIN_LITE_JWT_SECRET, process.env.JWT_SECRET]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (trimmed) return trimmed
  }
  return null
}

const buildStaffName = (firstName, lastName, fallbackEmail) => {
  const parts = []
  if (typeof firstName === 'string' && firstName.trim()) parts.push(firstName.trim())
  if (typeof lastName === 'string' && lastName.trim()) parts.push(lastName.trim())
  if (parts.length) return parts.join(' ')
  return fallbackEmail
}

const extractPermissions = (user) => {
  if (!user || typeof user !== 'object') return []
  const candidates = [
    user.metadata && user.metadata.admin_lite_permissions,
    user.metadata && user.metadata.adminLitePermissions,
    user.metadata && user.metadata.permissions,
  ]
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    const filtered = candidate
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
    if (filtered.length) return filtered
  }
  return []
}

const generateAdminLiteToken = (user) => {
  const secret = resolveSecret()
  if (!secret) {
    return { ok: false, message: 'Admin Lite token not configured' }
  }
  if (!user || typeof user !== 'object') {
    return { ok: false, message: 'Authentication response missing user profile' }
  }
  const identifierCandidates = []
  if (typeof user.id === 'string') identifierCandidates.push(user.id.trim())
  if (typeof user._id === 'string') identifierCandidates.push(user._id.trim())
  const identifier = identifierCandidates.find(Boolean) || ''
  const email = typeof user.email === 'string' ? user.email.trim() : ''
  if (!identifier || !email) {
    return { ok: false, message: 'Authentication response missing user details' }
  }
  const firstName = typeof user.first_name === 'string' ? user.first_name.trim() || null : null
  const lastName = typeof user.last_name === 'string' ? user.last_name.trim() || null : null
  const role = typeof user.role === 'string' ? user.role.trim() || null : null
  const permissions = extractPermissions(user)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: identifier,
    email,
    name: buildStaffName(firstName, lastName, email),
    iat: now,
    exp: now + DAY_IN_SECONDS,
  }
  if (firstName !== null) payload.first_name = firstName
  if (lastName !== null) payload.last_name = lastName
  if (role) payload.role = role
  if (permissions.length) payload.permissions = permissions
  const audience = cleanEnv(process.env.ADMIN_LITE_JWT_AUDIENCE)
  if (audience) payload.aud = audience
  const issuer = cleanEnv(process.env.ADMIN_LITE_JWT_ISSUER)
  if (issuer) payload.iss = issuer
  let token
  try {
    token = jwt.sign(payload, secret, { algorithm: 'HS256' })
  } catch (error) {
    return { ok: false, message: 'Failed to sign Admin Lite token' }
  }
  return {
    ok: true,
    token,
    user: {
      id: identifier,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      permissions,
    },
  }
}

module.exports = {
  cleanEnv,
  resolveSecret,
  generateAdminLiteToken,
  createAdminLiteToken: generateAdminLiteToken,
}

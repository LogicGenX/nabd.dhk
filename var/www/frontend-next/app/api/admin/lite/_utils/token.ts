import jwt from 'jsonwebtoken'

export type AdminLiteUserPayload = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  permissions: string[]
}

const DAY_IN_SECONDS = 60 * 60 * 24

const cleanEnv = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const buildStaffName = (firstName: string | null, lastName: string | null, fallbackEmail: string) => {
  const parts: string[] = []
  if (firstName && firstName.trim()) parts.push(firstName.trim())
  if (lastName && lastName.trim()) parts.push(lastName.trim())
  if (parts.length) return parts.join(' ')
  return fallbackEmail
}

const extractPermissions = (user: Record<string, unknown>) => {
  if (!user || typeof user !== 'object') return [] as string[]
  const metadata = (user as any).metadata || {}
  const candidates = [
    metadata.admin_lite_permissions,
    metadata.adminLitePermissions,
    metadata.permissions,
  ]

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    const filtered = candidate
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
    if (filtered.length) return filtered
  }

  return [] as string[]
}

export const createAdminLiteToken = (user: Record<string, any>) => {
  const secret = cleanEnv(process.env.ADMIN_LITE_JWT_SECRET)
  if (!secret) {
    return { ok: false as const, message: 'Admin Lite token not configured' }
  }

  if (!user || typeof user !== 'object') {
    return { ok: false as const, message: 'Authentication response missing user profile' }
  }

  const id = typeof user.id === 'string' ? user.id.trim() : ''
  const email = typeof user.email === 'string' ? user.email.trim() : ''
  if (!id || !email) {
    return { ok: false as const, message: 'Authentication response missing user details' }
  }

  const firstName = typeof user.first_name === 'string' ? user.first_name.trim() || null : null
  const lastName = typeof user.last_name === 'string' ? user.last_name.trim() || null : null
  const role = typeof user.role === 'string' ? user.role.trim() || null : null
  const permissions = extractPermissions(user)
  const now = Math.floor(Date.now() / 1000)

  const payload: jwt.JwtPayload = {
    sub: id,
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

  let token: string
  try {
    token = jwt.sign(payload, secret, { algorithm: 'HS256' })
  } catch (error) {
    return { ok: false as const, message: 'Failed to sign Admin Lite token' }
  }

  const resultUser: AdminLiteUserPayload = {
    id,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
    permissions,
  }

  return {
    ok: true as const,
    token,
    user: resultUser,
    payload,
  }
}

export const verifyAdminLiteToken = (token: string) => {
  const secret = cleanEnv(process.env.ADMIN_LITE_JWT_SECRET)
  if (!secret) return { ok: false as const, message: 'Admin Lite token not configured' }

  try {
    const audience = cleanEnv(process.env.ADMIN_LITE_JWT_AUDIENCE)
    const issuer = cleanEnv(process.env.ADMIN_LITE_JWT_ISSUER)
    const verifyOptions: jwt.VerifyOptions = { algorithms: ['HS256'] }
    if (audience) verifyOptions.audience = audience
    if (issuer) verifyOptions.issuer = issuer

    const payload = jwt.verify(token, secret, verifyOptions) as jwt.JwtPayload

    return { ok: true as const, payload }
  } catch (error: any) {
    return { ok: false as const, message: error?.message || 'Invalid Admin Lite token' }
  }
}

import jwt from 'jsonwebtoken'

export type AdminLiteUserProjection =
  | { ok: true; user: AdminLiteUserPayload }
  | { ok: false; message: string }

export type AdminLiteTokenResult =
  | { ok: true; token: string; user: AdminLiteUserPayload; payload: jwt.JwtPayload; ttl: number }
  | { ok: false; message: string }

export type AdminLiteUserPayload = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string | null
  permissions: string[]
}

const DAY_IN_SECONDS = 60 * 60 * 24
const DEFAULT_SESSION_TTL = DAY_IN_SECONDS

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
  const candidates = [metadata.admin_lite_permissions, metadata.adminLitePermissions, metadata.permissions]

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    const filtered = candidate
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
    if (filtered.length) return filtered
  }

  return [] as string[]
}

export const resolveSessionTtlSeconds = () => {
  const raw = cleanEnv(process.env.ADMIN_LITE_JWT_TTL_SECONDS)
  if (!raw) return DEFAULT_SESSION_TTL
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_TTL
  }
  return parsed
}

const buildLiteUserShape = (user: Record<string, unknown>): AdminLiteUserPayload | null => {
  if (!user || typeof user !== 'object') return null

  const identifierCandidates: Array<string> = []
  if (typeof (user as any).id === 'string') identifierCandidates.push((user as any).id.trim())
  if (typeof (user as any)._id === 'string') identifierCandidates.push((user as any)._id.trim())
  const id = identifierCandidates.find(Boolean)
  const email = typeof (user as any).email === 'string' ? (user as any).email.trim() : ''

  if (!id || !email) {
    return null
  }

  const firstName = typeof (user as any).first_name === 'string' ? (user as any).first_name.trim() || null : null
  const lastName = typeof (user as any).last_name === 'string' ? (user as any).last_name.trim() || null : null
  const role = typeof (user as any).role === 'string' ? (user as any).role.trim() || null : null
  const permissions = extractPermissions(user)

  return {
    id,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
    permissions,
  }
}

export const projectAdminLiteUser = (user: Record<string, unknown>): AdminLiteUserProjection => {
  if (!user || typeof user !== 'object') {
    return { ok: false as const, message: 'Authentication response missing user profile' }
  }
  const liteUser = buildLiteUserShape(user)
  if (!liteUser) {
    return { ok: false as const, message: 'Authentication response missing user details' }
  }
  return { ok: true as const, user: liteUser }
}

export const createAdminLiteToken = (user: Record<string, any>): AdminLiteTokenResult => {
  const secret = cleanEnv(process.env.ADMIN_LITE_JWT_SECRET)
  if (!secret) {
    return { ok: false as const, message: 'Admin Lite token not configured' }
  }

  const projection = projectAdminLiteUser(user)
  if (projection.ok === false) {
    return { ok: false as const, message: projection.message }
  }

  const liteUser = projection.user
  const now = Math.floor(Date.now() / 1000)
  const ttl = resolveSessionTtlSeconds()

  const payload: jwt.JwtPayload = {
    sub: liteUser.id,
    email: liteUser.email,
    name: buildStaffName(liteUser.first_name, liteUser.last_name, liteUser.email),
    iat: now,
    exp: now + ttl,
  }

  if (liteUser.first_name !== null) payload.first_name = liteUser.first_name
  if (liteUser.last_name !== null) payload.last_name = liteUser.last_name
  if (liteUser.role) payload.role = liteUser.role
  if (liteUser.permissions.length) payload.permissions = liteUser.permissions

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

  return {
    ok: true as const,
    token,
    user: liteUser,
    payload,
    ttl,
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

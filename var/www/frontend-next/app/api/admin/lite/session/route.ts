import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, buildAdminUrl } from '../../../lite/_utils/backend'

export const runtime = 'nodejs'

const DAY_IN_SECONDS = 60 * 60 * 24

type AdminUser = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  role?: string | null
}

type TokenCreationResult = { ok: true; token: string; user: AdminUser } | { ok: false; message: string }

type TokenVerificationResult =
  | { ok: true; user: AdminUser }
  | { ok: false; expired?: boolean; reason?: string }

const cleanEnv = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const resolveAdminLiteSecret = () => {
  return cleanEnv(process.env.ADMIN_LITE_JWT_SECRET) || cleanEnv(process.env.JWT_SECRET)
}

const buildStaffName = (firstName: string | null, lastName: string | null, fallbackEmail: string) => {
  const parts = [firstName, lastName].filter((part) => typeof part === 'string' && part.trim()) as string[]
  if (parts.length) {
    return parts.map((part) => part.trim()).join(' ')
  }
  return fallbackEmail
}

const extractPermissions = (user: any) => {
  const candidates = [
    user?.metadata?.admin_lite_permissions,
    user?.metadata?.adminLitePermissions,
    user?.metadata?.permissions,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((entry) => typeof entry === 'string' && entry.trim()) as string[]
    }
  }
  return [] as string[]
}

const createAdminLiteToken = (user: any): TokenCreationResult => {
  const secret = resolveAdminLiteSecret()
  if (!secret) {
    return { ok: false, message: 'Admin Lite token not configured' }
  }

  if (!user || typeof user !== 'object') {
    return { ok: false, message: 'Authentication response missing user profile' }
  }

  const idSource = typeof user.id === 'string' && user.id.trim() ? user.id.trim() : undefined
  const fallbackId = typeof user._id === 'string' && user._id.trim() ? user._id.trim() : undefined
  const identifier = idSource || fallbackId
  const email = typeof user.email === 'string' ? user.email.trim() : ''
  if (!identifier || !email) {
    return { ok: false, message: 'Authentication response missing user details' }
  }

  const firstName = typeof user.first_name === 'string' ? user.first_name.trim() || null : null
  const lastName = typeof user.last_name === 'string' ? user.last_name.trim() || null : null
  const role = typeof user.role === 'string' ? user.role.trim() || null : null
  const permissions = extractPermissions(user)

  const now = Math.floor(Date.now() / 1000)
  const payload: Record<string, any> = {
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

  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac('sha256', Buffer.from(secret, 'utf8')).update(signingInput).digest('base64url')

  const normalizedUser: AdminUser = {
    id: identifier,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
  }

  return { ok: true, token: `${signingInput}.${signature}`, user: normalizedUser }
}

const verifyAdminLiteToken = (token: string): TokenVerificationResult => {
  const secret = resolveAdminLiteSecret()
  if (!secret) {
    return { ok: false, reason: 'secret-missing' }
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return { ok: false, reason: 'format' }
  }

  const [encodedHeader, encodedPayload, providedSignature] = parts

  let header: any
  try {
    header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'))
  } catch (error) {
    console.warn('[admin-lite] Unable to decode Admin Lite token header', error)
    return { ok: false, reason: 'decode' }
  }

  if (!header || header.alg !== 'HS256') {
    return { ok: false, reason: 'algorithm' }
  }

  let expectedSignature: string
  try {
    expectedSignature = createHmac('sha256', Buffer.from(secret, 'utf8'))
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url')
  } catch (error) {
    console.error('[admin-lite] Unable to compute Admin Lite token signature', error)
    return { ok: false, reason: 'signature' }
  }

  let providedBuffer: Buffer
  let expectedBuffer: Buffer
  try {
    providedBuffer = Buffer.from(providedSignature, 'base64url')
    expectedBuffer = Buffer.from(expectedSignature, 'base64url')
  } catch (error) {
    console.warn('[admin-lite] Failed to parse Admin Lite token signature', error)
    return { ok: false, reason: 'signature' }
  }

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return { ok: false, reason: 'signature' }
  }

  let payload: any
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
  } catch (error) {
    console.warn('[admin-lite] Unable to decode Admin Lite token payload', error)
    return { ok: false, reason: 'decode' }
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp === 'number' && now >= payload.exp) {
    return { ok: false, expired: true }
  }
  if (typeof payload.nbf === 'number' && now < payload.nbf) {
    return { ok: false, reason: 'nbf' }
  }

  const expectedAudience = cleanEnv(process.env.ADMIN_LITE_JWT_AUDIENCE)
  if (expectedAudience) {
    const audienceValue = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!audienceValue.includes(expectedAudience)) {
      return { ok: false, reason: 'audience' }
    }
  }

  const expectedIssuer = cleanEnv(process.env.ADMIN_LITE_JWT_ISSUER)
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    return { ok: false, reason: 'issuer' }
  }

  const identifier =
    (typeof payload.sub === 'string' && payload.sub.trim()) ||
    (typeof payload.id === 'string' && payload.id.trim()) ||
    null
  const email = typeof payload.email === 'string' ? payload.email.trim() : null

  if (!identifier || !email) {
    return { ok: false, reason: 'payload' }
  }

  const firstName = typeof payload.first_name === 'string' ? payload.first_name : null
  const lastName = typeof payload.last_name === 'string' ? payload.last_name : null
  const role = typeof payload.role === 'string' ? payload.role : null

  return {
    ok: true,
    user: {
      id: identifier,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
    },
  }
}

const readJson = async (response: Response) => {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('[admin-lite] Failed to parse JSON from Medusa', error)
    return {}
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'development',
  sameSite: 'lax' as const,
  path: '/',
}

const unauthorized = (message = 'Not authenticated') => {
  const res = NextResponse.json({ message }, { status: 401 })
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    maxAge: 0,
    ...cookieOptions,
  })
  return res
}

const fetchCurrentUser = async (token: string) => {
  let url: string
  try {
    url = buildAdminUrl('auth')
  } catch (error) {
    console.error('[admin-lite] Missing Medusa backend url', error)
    return { status: 500, body: { message: 'MEDUSA_BACKEND_URL not configured' } }
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: 'Bearer ' + token,
        accept: 'application/json',
        'accept-encoding': 'identity',
      },
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[admin-lite] Unable to reach /admin/auth', error)
    return { status: 502, body: { message: 'Unable to reach backend' } }
  }

  if (response.status === 401) {
    return { status: 401, body: await readJson(response) }
  }

  if (!response.ok) {
    console.error('[admin-lite] /admin/auth failed', response.status)
    return { status: response.status, body: await readJson(response) }
  }

  return { status: 200, body: await readJson(response) }
}

export async function POST(req: NextRequest) {
  let payload: { email?: string; password?: string }
  try {
    payload = await req.json()
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 })
  }

  const email = (payload.email || '').trim()
  const password = payload.password || ''
  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
  }

  let authUrl: string
  try {
    authUrl = buildAdminUrl('auth')
  } catch (error) {
    console.error('[admin-lite] Backend not configured', error)
    return NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 })
  }

  let authResponse: Response
  try {
    authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'accept-encoding': 'identity',
      },
      cache: 'no-store',
      body: JSON.stringify({ email, password }),
    })
  } catch (error) {
    console.error('[admin-lite] Failed to reach /admin/auth', error)
    return NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
  }

  const authBody = await readJson(authResponse)
  if (authResponse.status === 401) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }
  if (!authResponse.ok) {
    console.error('[admin-lite] /admin/auth login failed', authResponse.status, authBody)
    return NextResponse.json({ message: 'Authentication failed' }, { status: 502 })
  }

  let accessToken = authBody?.access_token || authBody?.token || authBody?.user?.token

  let user = authBody?.user || null

  if (!accessToken) {
    const tokenResult = createAdminLiteToken(user)
    if (!tokenResult.ok) {
      const message = 'message' in tokenResult ? tokenResult.message : 'Unable to issue Admin Lite token'
      console.error('[admin-lite] Unable to issue Admin Lite token', message)
      return NextResponse.json({ message }, { status: 500 })
    }
    accessToken = tokenResult.token
    user = tokenResult.user
  }
  if (!user) {
    const who = await fetchCurrentUser(accessToken)
    if (who.status === 200) {
      user = who.body.user || null
    } else if (who.status !== 401) {
      console.warn('[admin-lite] Unable to fetch admin profile after login', who.status)
    }
  }

  const res = NextResponse.json({ ok: true, user })
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: accessToken,
    maxAge: DAY_IN_SECONDS,
    ...cookieOptions,
  })
  return res
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  const verification = verifyAdminLiteToken(token)
  if (verification.ok) {
    return NextResponse.json({ authenticated: true, user: verification.user })
  }
  if (!verification.ok) {
    if ('expired' in verification && verification.expired) {
      return unauthorized('Session expired')
    }
  }

  const result = await fetchCurrentUser(token)
  if (result.status === 401) {
    return unauthorized()
  }

  if (result.status !== 200) {
    return NextResponse.json({ message: 'Failed to inspect session', details: result.body }, { status: 502 })
  }

  return NextResponse.json({ authenticated: true, user: result.body.user || null })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    maxAge: 0,
    ...cookieOptions,
  })
  return res
}

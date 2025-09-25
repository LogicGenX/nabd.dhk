import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, buildAdminUrl } from '../../../lite/_utils/backend'
import {
  createAdminLiteToken,
  verifyAdminLiteToken,
  resolveSessionTtlSeconds,
  projectAdminLiteUser,
} from '../_utils/token'

export const runtime = 'nodejs'

const FALLBACK_SESSION_TTL = resolveSessionTtlSeconds()

const isSecureRequest = (req?: NextRequest) => {
  if (!req) {
    return process.env.NODE_ENV !== 'development'
  }

  const protocol = req.nextUrl?.protocol
  if (protocol === 'https:') {
    return true
  }
  if (protocol === 'http:') {
    return false
  }

  const forwardedProto = req.headers.get('x-forwarded-proto')
  if (forwardedProto) {
    const first = forwardedProto.split(',')[0]?.trim().toLowerCase()
    if (first === 'https') return true
    if (first === 'http') return false
  }

  return process.env.NODE_ENV !== 'development'
}

const getCookieOptions = (req?: NextRequest) => ({
  httpOnly: true,
  secure: isSecureRequest(req),
  sameSite: 'lax' as const,
  path: '/',
})

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

const unauthorized = (req: NextRequest, message = 'Not authenticated') => {
  const res = NextResponse.json({ message }, { status: 401 })
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    maxAge: 0,
    ...getCookieOptions(req),
  })
  return res
}

const buildLiteSessionUrl = (
  req: NextRequest | undefined,
  target: 'lite/session' | 'admin-lite/session' = 'lite/session'
) => {
  try {
    return buildAdminUrl(target, req)
  } catch (error) {
    console.error('[admin-lite] Backend not configured', error)
    return null
  }
}

const setProxyTargetHeader = (res: NextResponse, target: string | null) => {
  if (target) {
    res.headers.set('x-admin-proxy-target', target)
  }
}

const parseTtlSeconds = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return null
}

const fetchBackendSession = async (req: NextRequest | null, token: string) => {
  const targets: Array<'lite/session' | 'admin-lite/session'> = ['lite/session', 'admin-lite/session']
  let last404: { target: string; body?: unknown } | null = null

  for (const target of targets) {
    const url = buildLiteSessionUrl(req || undefined, target)
    if (!url) {
      continue
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          authorization: 'Bearer ' + token,
          'x-admin-lite-token': token,
          accept: 'application/json',
          'accept-encoding': 'identity',
        },
        cache: 'no-store',
      })

      if (response.status === 404) {
        const body = await readJson(response)
        last404 = { target, body }
        continue
      }

      const body = await readJson(response)
      return { status: response.status, body }
    } catch (error) {
      console.error('[admin-lite] Unable to reach /' + target, error)
      return { status: 502, body: { message: 'Unable to reach backend' } }
    }
  }

  return {
    status: 404,
    body: {
      message: 'Admin Lite session endpoint not found',
      details: last404?.body,
    },
  }
}

const loginViaMedusaAuth = async (
  req: NextRequest,
  email: string,
  password: string
): Promise<{ ok: boolean; response: NextResponse | null }> => {
  let tokenUrl: string
  try {
    tokenUrl = buildAdminUrl('auth/token', req)
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 }),
    }
  }

  let tokenResponse: Response
  try {
    tokenResponse = await fetch(tokenUrl, {
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
    return {
      ok: false,
      response: NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 }),
    }
  }

  const tokenBody = await readJson(tokenResponse)
  if (tokenResponse.status === 401) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Invalid credentials' }, { status: 401 }),
    }
  }

  if (!tokenResponse.ok) {
    const message = tokenBody?.message || 'Authentication failed'
    const status = tokenResponse.status >= 400 && tokenResponse.status <= 599 ? tokenResponse.status : 502
    const details: Record<string, unknown> = { message }
    if (tokenBody && typeof tokenBody === 'object') {
      details.details = tokenBody
    }
    return {
      ok: false,
      response: NextResponse.json(details, { status }),
    }
  }

  const adminToken = typeof tokenBody?.access_token === 'string' ? tokenBody.access_token.trim() : ''
  if (!adminToken) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Authentication failed' }, { status: 502 }),
    }
  }

  let profileUrl: string
  try {
    profileUrl = buildAdminUrl('auth', req)
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 }),
    }
  }

  let profileResponse: Response
  try {
    profileResponse = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        authorization: 'Bearer ' + adminToken,
        accept: 'application/json',
        'accept-encoding': 'identity',
      },
      cache: 'no-store',
    })
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 }),
    }
  }

  const profileBody = await readJson(profileResponse)
  if (!profileResponse.ok || !profileBody?.user) {
    const message = profileBody?.message || 'Authentication failed'
    const status = profileResponse.status >= 400 && profileResponse.status <= 599 ? profileResponse.status : 502
    const payload: Record<string, unknown> = { message }
    if (profileBody && typeof profileBody === 'object') {
      payload.details = profileBody
    }
    return {
      ok: false,
      response: NextResponse.json(payload, { status }),
    }
  }

  const tokenResult = createAdminLiteToken(profileBody.user)
  if (!tokenResult.ok) {
    return {
      ok: false,
      response: NextResponse.json({ message: tokenResult.message }, { status: 500 }),
    }
  }

  const ttl = tokenResult.ttl ?? FALLBACK_SESSION_TTL
  const res = NextResponse.json({ ok: true, user: tokenResult.user })
  setProxyTargetHeader(res, profileUrl)
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: tokenResult.token,
    maxAge: ttl,
    ...getCookieOptions(req),
  })

  return { ok: true, response: res }
}

export async function POST(req: NextRequest) {
  let payload: { email?: string; password?: string }
  try {
    payload = await req.json()
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 })
  }

  const email = (payload.email || '').trim()
  const password = typeof payload.password === 'string' ? payload.password : ''
  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
  }

  const targets: Array<'admin-lite/session' | 'lite/session'> = ['admin-lite/session', 'lite/session']
  let url: string | null = null
  let upstream: Response | null = null
  let last404: { target: string; body?: unknown } | null = null

  for (const target of targets) {
    url = buildLiteSessionUrl(req, target)
    if (!url) {
      continue
    }
    try {
      upstream = await fetch(url, {
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
      console.error('[admin-lite] Failed to reach /' + target, error)
      return NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
    }

    if (upstream.status !== 404) {
      break
    }

    const body = await readJson(upstream)
    last404 = { target, body }
    upstream = null
  }

  if (!url) {
    return NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 })
  }

  if (!upstream) {
    const fallback = await loginViaMedusaAuth(req, email, password)
    if (fallback.ok && fallback.response) {
      return fallback.response
    }

    if (fallback.response) {
      return fallback.response
    }

    const details = last404?.body
    const payload: Record<string, unknown> = {
      message: 'Admin Lite session endpoint not found',
      details,
    }

    return NextResponse.json(payload, { status: 404 })
  }

  const body = await readJson(upstream)
  if (upstream.status === 401) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }

  if (!upstream.ok) {
    const message = body?.message || 'Authentication failed'
    const status = upstream.status >= 400 && upstream.status <= 599 ? upstream.status : 502
    console.error('[admin-lite] /admin/lite/session login failed', upstream.status, body)
    const payload: Record<string, unknown> = { message }
    if (body && typeof body === 'object') {
      payload.details = body
    }
    return NextResponse.json(payload, { status })
  }

  const token = typeof body?.token === 'string' ? body.token : ''
  if (!token) {
    console.error('[admin-lite] /admin/lite/session response missing token', body)
    return NextResponse.json({ message: 'Authentication failed' }, { status: 502 })
  }

  const upstreamUser = body && typeof body === 'object' ? (body as any).user : undefined
  const projection = projectAdminLiteUser((upstreamUser || {}) as Record<string, unknown>)
  if (!projection.ok) {
    console.error('[admin-lite] /admin/lite/session response missing user profile', projection.message)
    return NextResponse.json({ message: projection.message || 'Authentication failed' }, { status: 502 })
  }

  const upstreamTtl = body && typeof body === 'object' ? (body as any).ttl : undefined
  const ttl = parseTtlSeconds(upstreamTtl) ?? FALLBACK_SESSION_TTL
  const res = NextResponse.json({ ok: true, user: projection.user })
  setProxyTargetHeader(res, url)
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    maxAge: ttl,
    ...getCookieOptions(req),
  })
  return res
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized(req)
  }

  const result = await fetchBackendSession(req, token)
  if (result.status === 401) {
    return unauthorized(req, 'Session expired')
  }

  if (result.status === 404) {
    const verified = verifyAdminLiteToken(token)
    if (!verified.ok) {
      return unauthorized(req, 'Session invalid')
    }

    const payload = verified.payload || {}
    const user = {
      id: typeof payload.sub === 'string' ? payload.sub : null,
      email: typeof payload.email === 'string' ? payload.email : null,
      first_name: typeof payload.first_name === 'string' ? payload.first_name : null,
      last_name: typeof payload.last_name === 'string' ? payload.last_name : null,
      role: typeof payload.role === 'string' ? payload.role : null,
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.map((entry: unknown) => (typeof entry === 'string' ? entry : '')).filter(Boolean)
        : [],
    }

    return NextResponse.json({ authenticated: true, user })
  }

  if (result.status !== 200) {
    const status = result.status >= 400 ? result.status : 502
    return NextResponse.json(
      { message: result.body?.message || 'Failed to inspect session', details: result.body },
      { status }
    )
  }

  return NextResponse.json({
    authenticated: Boolean(result.body?.authenticated),
    user: result.body?.user || null,
  })
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    maxAge: 0,
    ...getCookieOptions(req),
  })
  return res
}

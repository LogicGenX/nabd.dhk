import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE = 'admin_lite_token'
const DAY_IN_SECONDS = 60 * 60 * 24

const getBackendBase = () => {
  return process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_URL
}

const buildBackendUrl = (path: string) => {
  const base = getBackendBase()
  if (!base) {
    throw new Error('MEDUSA_BACKEND_URL not configured')
  }
  return base.replace(/\/$/, '') + path
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
    url = buildBackendUrl('/admin/users/me')
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
      },
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[admin-lite] Unable to reach /admin/users/me', error)
    return { status: 502, body: { message: 'Unable to reach backend' } }
  }

  if (response.status === 401) {
    return { status: 401, body: await readJson(response) }
  }

  if (!response.ok) {
    console.error('[admin-lite] /admin/users/me failed', response.status)
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

  let tokenUrl: string
  try {
    tokenUrl = buildBackendUrl('/admin/auth/token')
  } catch (error) {
    console.error('[admin-lite] Backend not configured', error)
    return NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 })
  }

  let tokenResponse: Response
  try {
    tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ email, password }),
    })
  } catch (error) {
    console.error('[admin-lite] Failed to reach Medusa auth/token', error)
    return NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
  }

  const tokenBody = await readJson(tokenResponse)
  if (tokenResponse.status === 401) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }
  if (!tokenResponse.ok) {
    console.error('[admin-lite] auth/token failed', tokenResponse.status, tokenBody)
    return NextResponse.json({ message: 'Authentication failed' }, { status: 502 })
  }

  const accessToken = tokenBody.access_token || tokenBody.token
  if (!accessToken) {
    console.error('[admin-lite] Missing access token from auth/token response', tokenBody)
    return NextResponse.json({ message: 'Authentication response malformed' }, { status: 502 })
  }

  let user = null
  const userResult = await fetchCurrentUser(accessToken)
  if (userResult.status === 200) {
    user = userResult.body.user || null
  } else if (userResult.status !== 401) {
    console.warn('[admin-lite] Unable to fetch admin profile', userResult.status)
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

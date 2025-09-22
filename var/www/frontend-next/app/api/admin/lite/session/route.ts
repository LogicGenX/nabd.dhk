import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, buildAdminUrl } from '../../../lite/_utils/backend'

export const runtime = 'nodejs'

const DAY_IN_SECONDS = 60 * 60 * 24

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'development',
  sameSite: 'lax' as const,
  path: '/',
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

const buildLiteSessionUrl = () => {
  try {
    return buildAdminUrl('lite/session')
  } catch (error) {
    console.error('[admin-lite] Backend not configured', error)
    return null
  }
}

const fetchBackendSession = async (token: string) => {
  const url = buildLiteSessionUrl()
  if (!url) {
    return { status: 500, body: { message: 'MEDUSA_BACKEND_URL not configured' } }
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: 'Bearer ' + token,
        'x-admin-lite-token': token,
        accept: 'application/json',
        'accept-encoding': 'identity',
      },
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[admin-lite] Unable to reach /admin/lite/session', error)
    return { status: 502, body: { message: 'Unable to reach backend' } }
  }

  const body = await readJson(response)
  return { status: response.status, body }
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

  const url = buildLiteSessionUrl()
  if (!url) {
    return NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 })
  }

  let upstream: Response
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
    console.error('[admin-lite] Failed to reach /admin/lite/session', error)
    return NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
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

  const res = NextResponse.json({ ok: true, user: body?.user || null })
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
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

  const result = await fetchBackendSession(token)
  if (result.status === 401) {
    return unauthorized('Session expired')
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

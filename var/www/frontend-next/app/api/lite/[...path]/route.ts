import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ADMIN_COOKIE = 'admin_lite_token'
const backendBase = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_URL

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'content-length',
  'accept-encoding',
])

const buildTargetUrl = (segments: string[] | undefined, search: string) => {
  const parts = segments && segments.length ? segments.join('/') : ''
  const trimmed = parts.replace(/^\/+/, '')
  const base = (backendBase || '').replace(/\/$/, '')
  const url = base + '/admin' + (trimmed ? '/' + trimmed : '')
  return url + search
}

const deriveOrigin = (req: NextRequest) => {
  const referer = req.headers.get('referer')
  let refererOrigin: string | undefined
  if (referer) {
    try {
      refererOrigin = new URL(referer).origin
    } catch (error) {
      console.warn('[admin-lite] Unable to parse referer header', referer)
    }
  }
  return (
    req.headers.get('origin') ||
    req.headers.get('x-forwarded-origin') ||
    refererOrigin
  )
}

const safeJsonParse = (value: string | null) => {
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch (error) {
    return value
  }
}

const copyHeaders = (request: NextRequest, token: string) => {
  const headers = new Headers()
  headers.set('authorization', 'Bearer ' + token)

  const origin = deriveOrigin(request)
  if (origin) {
    headers.set('origin', origin)
    headers.set('x-forwarded-origin', origin)
    headers.set('x-forwarded-host', origin.replace(/^https?:\/\//, ''))
  }

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (hopByHopHeaders.has(lower)) return
    if (lower === 'cookie') {
      headers.append(key, value)
      return
    }
    if (!headers.has(key)) headers.set(key, value)
  })

  if (!headers.has('content-type') && request.headers.has('content-type')) {
    const contentType = request.headers.get('content-type')
    if (contentType) headers.set('content-type', contentType)
  }

  headers.set('accept-encoding', 'identity')
  return headers
}

const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
  })
}

const proxy = async (req: NextRequest, context: { params: { path?: string[] } }) => {
  if (!backendBase) {
    return NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 })
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    const res = NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    clearAuthCookie(res)
    return res
  }

  const targetUrl = buildTargetUrl(context.params.path, req.nextUrl.search)
  const headers = copyHeaders(req, token)
  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  }

  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = await req.arrayBuffer()
  }

  let backendResponse: Response
  try {
    backendResponse = await fetch(targetUrl, init)
  } catch (error) {
    console.error('[admin-lite] Proxy request failed', error)
    return NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
  }

  if (backendResponse.status === 401) {
    const payloadText = await backendResponse.text()
    const details = safeJsonParse(payloadText)
    const res = NextResponse.json({ message: 'Session expired', details }, { status: 401 })
    clearAuthCookie(res)
    return res
  }

  const responseHeaders = new Headers()
  backendResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (hopByHopHeaders.has(lower) || lower === 'set-cookie') return
    responseHeaders.set(key, value)
  })

  responseHeaders.delete('content-encoding')

  const body = await backendResponse.arrayBuffer()
  return new NextResponse(body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
export const OPTIONS = proxy

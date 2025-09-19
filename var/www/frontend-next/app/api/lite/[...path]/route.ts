import { NextRequest, NextResponse } from 'next/server'

const backendBase = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_URL
const adminToken = process.env.ADMIN_LITE_JWT
const forwardedOrigin = process.env.ADMIN_LITE_PROXY_ORIGIN || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : undefined)

const buildTargetUrl = (segments: string[] | undefined, search: string) => {
  const parts = segments && segments.length ? segments.join('/') : ''
  const trimmed = parts.replace(/^\/+/, '')
  const base = (backendBase || '').replace(/\/$/, '')
  const url = base + '/admin/lite' + (trimmed ? '/' + trimmed : '')
  return url + search
}

const copyHeaders = (request: NextRequest) => {
  const headers = new Headers()
  headers.set('authorization', 'Bearer ' + adminToken)
  if (forwardedOrigin) {
    headers.set('origin', forwardedOrigin)
    headers.set('x-forwarded-origin', forwardedOrigin)
    headers.set('x-forwarded-host', forwardedOrigin.replace(/^https?:\/\//, ''))
  }
  request.headers.forEach((value, key) => {
    if (key === 'host' || key === 'content-length' || key === 'authorization') return
    if (key === 'cookie') headers.append(key, value)
    else if (!headers.has(key)) headers.set(key, value)
  })
  if (!headers.has('content-type') && request.headers.has('content-type')) {
    const contentType = request.headers.get('content-type')
    if (contentType) headers.set('content-type', contentType)
  }
  return headers
}

const proxy = async (req: NextRequest, context: { params: { path?: string[] } }) => {
  if (!backendBase) {
    return NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 })
  }
  if (!adminToken) {
    return NextResponse.json({ message: 'ADMIN_LITE_JWT not configured' }, { status: 500 })
  }

  const targetUrl = buildTargetUrl(context.params.path, req.nextUrl.search)
  const headers = copyHeaders(req)
  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  const response = await fetch(targetUrl, init)
  const responseHeaders = new Headers()
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return
    responseHeaders.set(key, value)
  })

  const body = await response.arrayBuffer()
  return new NextResponse(body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
export const OPTIONS = proxy

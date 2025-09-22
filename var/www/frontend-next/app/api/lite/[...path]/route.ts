import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  buildAdminUrl,
  buildUpstreamHeaders,
  clearAuthCookie,
  stripHopByHopResponseHeaders,
} from '../_utils/backend'

export const runtime = 'nodejs'

const unauthorized = () => {
  const res = NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  clearAuthCookie(res)
  return res
}

const buildTargetUrl = (req: NextRequest, segments: string[] | undefined, search: string) => {
  const parts = segments && segments.length ? segments.join('/') : ''
  const url = buildAdminUrl(parts, req)
  return url + search
}

const safeJsonParse = (value: string | null) => {
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch (error) {
    return value
  }
}

const proxy = async (req: NextRequest, context: { params: { path?: string[] } }) => {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  let targetUrl: string
  try {
    targetUrl = buildTargetUrl(req, context.params.path, req.nextUrl.search)
  } catch (error) {
    console.error('[admin-lite] Backend URL not configured', error)
    return NextResponse.json({ message: 'MEDUSA_BACKEND_URL not configured' }, { status: 500 })
  }

  const init: RequestInit = {
    method: req.method,
    headers: buildUpstreamHeaders(req, token),
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

  const responseHeaders = stripHopByHopResponseHeaders(backendResponse)

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

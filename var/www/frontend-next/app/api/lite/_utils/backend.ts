import { NextRequest, NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'admin_lite_token'

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

export const getBackendBase = () => {
  return process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_URL
}

const ADMIN_SUFFIX_PATTERN = /\/admin(?:\/lite)?$/i
const STORE_SUFFIX_PATTERN = /\/store$/i

const ensureAdminBase = (base: string) => {
  const trimmed = base.trim()
  if (!trimmed) {
    throw new Error('MEDUSA_BACKEND_URL not configured')
  }
  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')
  const withoutStoreSuffix = withoutTrailingSlash.replace(STORE_SUFFIX_PATTERN, '')
  const normalizedRoot = withoutStoreSuffix.replace(ADMIN_SUFFIX_PATTERN, '')
  return normalizedRoot + '/admin'
}

const normalizeAdminPath = (path: string) => {
  const trimmed = (path || '').trim()
  if (!trimmed) return ''
  const withoutLeadingSlash = trimmed.replace(/^\/+/, '')
  const withoutAdminPrefix = withoutLeadingSlash.startsWith('admin/')
    ? withoutLeadingSlash.slice(6)
    : withoutLeadingSlash
  return withoutAdminPrefix ? '/' + withoutAdminPrefix : ''
}

export const buildAdminUrl = (path: string) => {
  const base = getBackendBase()
  if (!base) {
    throw new Error('MEDUSA_BACKEND_URL not configured')
  }
  const adminBase = ensureAdminBase(base)
  const suffix = normalizeAdminPath(path)
  return adminBase + suffix
}

export const clearAuthCookie = (response: NextResponse) => {
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

export const buildUpstreamHeaders = (req: NextRequest | null, token: string, extra?: HeadersInit) => {
  const headers = new Headers(extra || undefined)
  headers.set('authorization', 'Bearer ' + token)
  headers.set('accept', 'application/json')
  headers.set('accept-encoding', 'identity')

  if (req) {
    const origin = deriveOrigin(req)
    if (origin) {
      headers.set('origin', origin)
      headers.set('x-forwarded-origin', origin)
      headers.set('x-forwarded-host', origin.replace(/^https?:\/\//, ''))
    }

    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (hopByHopHeaders.has(lower) || lower === 'authorization' || lower === 'cookie') return
      if (!headers.has(key)) headers.set(key, value)
    })
  }

  return headers
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

export const stripHopByHopResponseHeaders = (response: Response) => {
  const headers = new Headers()
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (hopByHopHeaders.has(lower) || lower === 'set-cookie' || lower === 'content-encoding') return
    headers.set(key, value)
  })
  return headers
}


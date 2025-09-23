import { NextRequest, NextResponse } from 'next/server'

import {
  DEFAULT_DEVELOPMENT_MEDUSA_BACKEND_URL,
  DEFAULT_PRODUCTION_MEDUSA_BACKEND_URL,
} from '../../../../lib/constants'

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
  'host',
])

const normalizeEnvUrl = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const firstHeaderValue = (value?: string | null) => {
  if (!value) return undefined
  const first = value.split(',')[0]?.trim()
  return first || undefined
}

const cleanProtocol = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.replace(/:$/, '')
}

const deriveRequestBase = (req?: NextRequest) => {
  if (!req) return undefined

  const host =
    firstHeaderValue(req.headers.get('x-forwarded-host')) ||
    firstHeaderValue(req.headers.get('host')) ||
    req.nextUrl?.host

  if (!host) return undefined

  const protocol =
    cleanProtocol(firstHeaderValue(req.headers.get('x-forwarded-proto'))) ||
    cleanProtocol(req.nextUrl?.protocol) ||
    'https'

  return `${protocol}://${host}`.replace(/\/+$/, '')
}

const resolveDefaultBackend = () => {
  const env = process.env.NODE_ENV
  if (env === 'development' || env === 'test') {
    return DEFAULT_DEVELOPMENT_MEDUSA_BACKEND_URL
  }
  return DEFAULT_PRODUCTION_MEDUSA_BACKEND_URL
}

export const getBackendBase = (req?: NextRequest) => {
  return (
    normalizeEnvUrl(process.env.MEDUSA_BACKEND_URL) ||
    normalizeEnvUrl(process.env.NEXT_PUBLIC_MEDUSA_URL) ||
    deriveRequestBase(req) ||
    resolveDefaultBackend()
  )
}

const ADMIN_SUFFIX_PATTERN = /\/admin(?:\/lite)?$/i
const STORE_SUFFIX_PATTERN = /\/store$/i
const ADMIN_LITE_PUBLIC_PREFIX = /^admin-lite(?:[/?]|$)/

const normalizeBackendRoot = (base: string) => {
  const trimmed = base.trim()
  if (!trimmed) {
    throw new Error('MEDUSA_BACKEND_URL not configured')
  }
  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')
  const withoutStoreSuffix = withoutTrailingSlash.replace(STORE_SUFFIX_PATTERN, '')
  return withoutStoreSuffix.replace(ADMIN_SUFFIX_PATTERN, '')
}

const ensureAdminBase = (base: string) => {
  const normalizedRoot = normalizeBackendRoot(base)
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

export const buildAdminUrl = (path: string, req?: NextRequest) => {
  const base = getBackendBase(req)
  if (!base) {
    throw new Error('MEDUSA_BACKEND_URL not configured')
  }
  const trimmedPath = (path || '').trim()
  if (!trimmedPath) {
    return ensureAdminBase(base)
  }

  const withoutLeadingSlash = trimmedPath.replace(/^\/+/, '')
  if (ADMIN_LITE_PUBLIC_PREFIX.test(withoutLeadingSlash)) {
    const rootBase = normalizeBackendRoot(base)
    return rootBase + '/' + withoutLeadingSlash
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


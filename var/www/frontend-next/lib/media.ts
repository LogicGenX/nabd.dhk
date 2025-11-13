import {
  DEFAULT_DEVELOPMENT_MEDUSA_BACKEND_URL,
  DEFAULT_PRODUCTION_MEDUSA_BACKEND_URL,
} from './constants'

const removeCommaBeforeSlash = (value: string) => value.replace(/,(?=\/)/g, '')

const stripTrailingDelimiters = (value: string) => value.replace(/[,\s]+$/g, '')

const normalizeBase = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const sanitized = stripTrailingDelimiters(removeCommaBeforeSlash(trimmed))
  if (!sanitized) return ''
  return sanitized.replace(/\/+$/, '')
}

const fallbackMedusaUrl =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    ? DEFAULT_DEVELOPMENT_MEDUSA_BACKEND_URL
    : DEFAULT_PRODUCTION_MEDUSA_BACKEND_URL

const medusaAssetsBase =
  normalizeBase(process.env.NEXT_PUBLIC_MEDUSA_ASSETS_URL) ||
  normalizeBase(process.env.NEXT_PUBLIC_MEDUSA_PUBLIC_URL) ||
  normalizeBase(process.env.NEXT_PUBLIC_MEDUSA_URL) ||
  normalizeBase(fallbackMedusaUrl)

const hasProtocol = /^https?:\/\//i
const protocolRelative = /^\/\//
const dataUri = /^data:/i
const uploadsSegment = /\/uploads\//i

export const ensureMedusaFileUrl = (value?: string | null) => {
  if (!value || typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  const sanitized = removeCommaBeforeSlash(trimmed)

  if (hasProtocol.test(sanitized) || protocolRelative.test(sanitized) || dataUri.test(sanitized)) {
    return sanitized
  }

  if (!uploadsSegment.test(sanitized)) {
    return sanitized
  }

  const normalized = sanitized.startsWith('/') ? sanitized : '/' + sanitized
  if (!medusaAssetsBase) {
    return normalized
  }
  return medusaAssetsBase + normalized
}

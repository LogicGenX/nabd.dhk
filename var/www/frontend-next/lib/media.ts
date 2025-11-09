import {
  DEFAULT_DEVELOPMENT_MEDUSA_BACKEND_URL,
  DEFAULT_PRODUCTION_MEDUSA_BACKEND_URL,
} from './constants'

const normalizeBase = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.replace(/\/+$/, '')
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

  if (hasProtocol.test(trimmed) || protocolRelative.test(trimmed) || dataUri.test(trimmed)) {
    return trimmed
  }

  if (!uploadsSegment.test(trimmed)) {
    return trimmed
  }

  const normalized = trimmed.startsWith('/') ? trimmed : '/' + trimmed
  if (!medusaAssetsBase) {
    return normalized
  }
  return medusaAssetsBase + normalized
}

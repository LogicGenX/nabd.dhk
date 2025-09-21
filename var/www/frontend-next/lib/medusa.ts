import Medusa from '@medusajs/medusa-js'
import {
  DEFAULT_DEVELOPMENT_MEDUSA_BACKEND_URL,
  DEFAULT_PRODUCTION_MEDUSA_BACKEND_URL,
} from './constants'

const normalized = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  return trimmed
}

const fallbackMedusaUrl =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    ? DEFAULT_DEVELOPMENT_MEDUSA_BACKEND_URL
    : DEFAULT_PRODUCTION_MEDUSA_BACKEND_URL

const medusaUrl = normalized(process.env.NEXT_PUBLIC_MEDUSA_URL) || fallbackMedusaUrl

export const medusa = new Medusa({ baseUrl: medusaUrl, maxRetries: 3 })

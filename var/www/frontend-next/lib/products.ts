import { ensureMedusaFileUrl } from './media'

export const FALLBACK_IMAGE = '/placeholder.svg'

export interface ProductSummary {
  id: string
  title: string
  thumbnail: string
  price: number
  variantId?: string
  variantTitle?: string
}

const safeArray = <T>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : []
}

const resolveThumbnail = (product: any) => {
  if (typeof product?.thumbnail === 'string' && product.thumbnail.trim()) {
    const normalized = ensureMedusaFileUrl(product.thumbnail)
    if (normalized) {
      return normalized
    }
  }
  const images = safeArray<{ url?: string }>(product?.images)
  const firstImage = images.find((image) => typeof image?.url === 'string' && image.url.trim())
  if (firstImage?.url) {
    const normalized = ensureMedusaFileUrl(firstImage.url)
    if (normalized) {
      return normalized
    }
  }
  return FALLBACK_IMAGE
}

const resolvePrimaryVariant = (product: any) => {
  const variants = safeArray<any>(product?.variants)
  if (!variants.length) return undefined
  return variants.find((variant) => variant?.inventory_quantity !== 0) || variants[0]
}

export const mapProductSummary = (product: any): ProductSummary => {
  const primaryVariant = resolvePrimaryVariant(product)
  const price = primaryVariant?.prices?.[0]?.amount
  return {
    id: product.id,
    title: product.title,
    thumbnail: resolveThumbnail(product),
    price: typeof price === 'number' ? price / 100 : 0,
    variantId: primaryVariant?.id,
    variantTitle: primaryVariant?.title,
  }
}

export const splitName = (fullName: string | undefined | null) => {
  if (!fullName) {
    return { first_name: 'Customer', last_name: null }
  }
  const clean = fullName.trim()
  if (!clean) {
    return { first_name: 'Customer', last_name: null }
  }
  const parts = clean.split(/\s+/)
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: null }
  }
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' ') || null,
  }
}

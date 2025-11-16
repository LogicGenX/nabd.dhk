import { NextRequest, NextResponse } from 'next/server'

import { medusa } from '../../../../lib/medusa'
import { mapProductSummary, type ProductSummary } from '../../../../lib/products'

const parseNumber = (value: string | null, fallback = 0) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clampLimit = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 12
  return Math.min(48, Math.max(1, Math.floor(value)))
}

const normalizeMetadataList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return []
}

const matchesList = (list: string[], target: string | null | undefined) => {
  if (!target) return true
  const normalized = target.trim().toLowerCase()
  if (!normalized) return true
  return list.some((value) => value.toLowerCase() === normalized)
}

const shouldInclude = (product: any, summary: ProductSummary, filters: { size?: string; color?: string; priceMin?: number | null; priceMax?: number | null }) => {
  const metadata = product?.metadata || {}
  const sizes = normalizeMetadataList(metadata.available_sizes || metadata.availableSizes)
  const colors = normalizeMetadataList(metadata.available_colors || metadata.availableColors)

  if (filters.size && !matchesList(sizes, filters.size)) {
    return false
  }
  if (filters.color && !matchesList(colors, filters.color)) {
    return false
  }

  const min = filters.priceMin ?? null
  const max = filters.priceMax ?? null
  if (min !== null && summary.price < min) {
    return false
  }
  if (max !== null && summary.price > max) {
    return false
  }

  return true
}

export const runtime = 'nodejs'

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl
    const cursor = parseNumber(searchParams.get('cursor'))
    const limit = clampLimit(parseNumber(searchParams.get('limit'), 12))
    const order = searchParams.get('order') || '-created_at'
    const collectionId = searchParams.get('collectionId')
    const categoryId = searchParams.get('categoryId')
    const q = searchParams.get('q')
    const size = searchParams.get('size') || undefined
    const color = searchParams.get('color') || undefined
    const priceMin = searchParams.get('priceMin')
    const priceMax = searchParams.get('priceMax')

    const minPrice = priceMin ? Number(priceMin) : null
    const maxPrice = priceMax ? Number(priceMax) : null

    const chunkSize = Math.max(limit, 24)
    let pointer = cursor
    let totalCount = 0
    let exhausted = false
    const aggregated: ProductSummary[] = []

    while (aggregated.length < limit && !exhausted) {
      const response = await medusa.products.list({
        limit: chunkSize,
        offset: pointer,
        order,
        ...(collectionId ? { collection_id: [collectionId] } : {}),
        ...(categoryId ? { category_id: [categoryId] } : {}),
        ...(q ? { q } : {}),
      })
      const { products, count } = response
      totalCount = typeof count === 'number' ? count : totalCount

      if (!Array.isArray(products) || products.length === 0) {
        exhausted = true
        break
      }

      for (const product of products) {
        const summary = mapProductSummary(product)
        if (shouldInclude(product, summary, { size, color, priceMin: minPrice, priceMax: maxPrice })) {
          aggregated.push(summary)
          if (aggregated.length === limit) {
            break
          }
        }
      }

      pointer += products.length
      if (products.length < chunkSize) {
        exhausted = true
      }
    }

    const nextCursor = Math.min(pointer, totalCount || pointer)
    const hasMore = !exhausted && nextCursor < (totalCount || nextCursor + 1)

    return NextResponse.json({
      products: aggregated.slice(0, limit),
      cursor: nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error('[catalog/products] failed to load products', error)
    return NextResponse.json(
      {
        products: [],
        cursor: 0,
        hasMore: false,
      },
      { status: 200 },
    )
  }
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'
import { mapProductSummary, type ProductSummary } from '../lib/products'
import { medusa } from '../lib/medusa'

interface Props {
  collectionId?: string
  categoryId?: string
  q?: string
  order?: string
  size?: string
  color?: string
  priceMin?: string
  priceMax?: string
}

const normalizeList = (value: unknown) => {
  if (!value) return [] as string[]
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

const matchesFilter = (
  product: any,
  summary: ProductSummary,
  filters: { size?: string; color?: string; priceMin?: number | null; priceMax?: number | null },
) => {
  const metadata = product?.metadata || {}
  const sizes = normalizeList(metadata.available_sizes || metadata.availableSizes)
  const colors = normalizeList(metadata.available_colors || metadata.availableColors)

  if (filters.size) {
    const normalized = filters.size.trim().toLowerCase()
    if (!sizes.some((value) => value.toLowerCase() === normalized)) {
      return false
    }
  }

  if (filters.color) {
    const normalized = filters.color.trim().toLowerCase()
    if (!colors.some((value) => value.toLowerCase() === normalized)) {
      return false
    }
  }

  if (typeof filters.priceMin === 'number' && summary.price < filters.priceMin) {
    return false
  }
  if (typeof filters.priceMax === 'number' && summary.price > filters.priceMax) {
    return false
  }

  return true
}

export default function ProductGrid({
  collectionId,
  categoryId,
  q,
  order,
  size,
  color,
  priceMin,
  priceMax,
}: Props) {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const limit = 12
  const loadingRef = useRef(false)
  const cursorRef = useRef(0)

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    cursorRef.current = cursor
  }, [cursor])

  const load = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return
      setLoading(true)
      loadingRef.current = true

      const nextCursor = reset ? 0 : cursorRef.current
      const filters = {
        size: size?.trim(),
        color: color?.trim(),
        priceMin: priceMin && !Number.isNaN(Number(priceMin)) ? Number(priceMin) : null,
        priceMax: priceMax && !Number.isNaN(Number(priceMax)) ? Number(priceMax) : null,
      }

      const pageSize = Math.max(limit, 24)
      const collected: ProductSummary[] = []
      let pointer = nextCursor
      let moreAvailable = true

      try {
        while (collected.length < limit && moreAvailable) {
          const params: Record<string, unknown> = {
            limit: pageSize,
            offset: pointer,
            order: order || '-created_at',
          }
          if (collectionId) params.collection_id = [collectionId]
          if (categoryId) params.category_id = [categoryId]
          if (q) params.q = q

          const { products } = await medusa.products.list(params)
          if (!Array.isArray(products) || !products.length) {
            moreAvailable = false
            break
          }

          for (const product of products) {
            const summary = mapProductSummary(product)
            if (matchesFilter(product, summary, filters)) {
              collected.push(summary)
              if (collected.length === limit) break
            }
          }

          pointer += products.length
          if (products.length < pageSize) {
            moreAvailable = false
          }
        }

        setProducts((prev) => (reset ? collected : [...prev, ...collected]))
        setCursor(pointer)
        setHasMore(moreAvailable)
      } catch (error) {
        console.error('[ProductGrid] failed to load products', error)
        if (reset) {
          setProducts([])
          setCursor(0)
          setHasMore(false)
        }
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [collectionId, categoryId, q, order, size, color, priceMin, priceMax],
  )

  useEffect(() => {
    setCursor(0)
    cursorRef.current = 0
    load(true)
  }, [load])

  return (
    <div>
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8'>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {loading && products.length === 0 &&
          Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
      </div>
      {loading && products.length > 0 && <p className='text-center py-4'>Loading...</p>}
      {hasMore && !loading && (
        <div className='text-center py-4'>
          <button onClick={() => load()} className='px-5 py-3 border rounded-full'>
            Load more
          </button>
        </div>
      )}
      {!loading && !products.length && <p className='text-center py-8 text-sm text-gray-500'>No products match these filters.</p>}
    </div>
  )
}

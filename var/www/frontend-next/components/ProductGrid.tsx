'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'
import type { ProductSummary } from '../lib/products'

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

interface CatalogResponse {
  products: ProductSummary[]
  cursor: number
  hasMore: boolean
}

const buildQuery = (params: Record<string, string | undefined>) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, value)
  })
  return query.toString()
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
      const query = buildQuery({
        limit: String(limit),
        cursor: String(nextCursor),
        order: order || '-created_at',
        collectionId: collectionId || undefined,
        categoryId: categoryId || undefined,
        q: q || undefined,
        size: size || undefined,
        color: color || undefined,
        priceMin: priceMin || undefined,
        priceMax: priceMax || undefined,
      })

      try {
        const response = await fetch(`/api/catalog/products?${query}`)
        if (!response.ok) {
          throw new Error('Unable to load products')
        }
        const payload: CatalogResponse = await response.json()
        setProducts((prev) => (reset ? payload.products : [...prev, ...payload.products]))
        setCursor(payload.cursor)
        setHasMore(payload.hasMore)
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

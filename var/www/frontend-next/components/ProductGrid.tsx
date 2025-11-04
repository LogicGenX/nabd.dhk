'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { medusa } from '../lib/medusa'
import ProductCard, { type Product } from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'

interface Props {
  collectionId?: string
  categoryId?: string
  q?: string
  order?: string
}

export default function ProductGrid({
  collectionId,
  categoryId,
  q,
  order,
}: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const limit = 12

  // Keep mutable values stable for load() without bloating deps
  const loadingRef = useRef<boolean>(false)
  const offsetRef = useRef<number>(0)

  // Sync refs with state
  useEffect(() => {
    loadingRef.current = loading
  }, [loading])
  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  const load = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return
      setLoading(true)
      loadingRef.current = true

      const effectiveOffset = reset ? 0 : offsetRef.current
      const params: Record<string, unknown> = { limit, offset: effectiveOffset }
      if (collectionId) params.collection_id = [collectionId]
      if (categoryId) params.category_id = [categoryId]
      if (q) params.q = q
      const sort = typeof order === 'string' && order.trim() ? order : '-created_at'
      params.order = sort

      const { products } = await medusa.products.list(params)
      const mapped: Product[] = products.map((p: any) => {
        const thumb =
          (typeof p.thumbnail === 'string' && p.thumbnail) ||
          p.images?.[0]?.url ||
          '/placeholder.svg'
        return {
          id: p.id,
          title: p.title,
          thumbnail: thumb,
          price: p.variants[0]?.prices[0]?.amount / 100 || 0,
        }
      })

      // Update products and offsets
      setProducts((prev) => (reset ? mapped : [...prev, ...mapped]))
      const newOffset = reset ? mapped.length : effectiveOffset + mapped.length
      offsetRef.current = newOffset
      setOffset(newOffset)
      setHasMore(products.length === limit)

      setLoading(false)
      loadingRef.current = false
    },
    [collectionId, categoryId, q, order]
  )

  useEffect(() => {
    setOffset(0)
    offsetRef.current = 0
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
      {loading && products.length > 0 && (
        <p className='text-center py-4'>Loading...</p>
      )}
      {hasMore && !loading && (
        <div className='text-center py-4'>
          <button
            onClick={() => load()}
            className='px-5 py-3 border rounded-full'
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}

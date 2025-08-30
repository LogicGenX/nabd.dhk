'use client'

import { useEffect, useState } from 'react'
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

  const load = async (reset = false) => {
    if (loading) return
    setLoading(true)
    const params: any = { limit, offset: reset ? 0 : offset }
    if (collectionId) params.collection_id = collectionId
    if (categoryId) params.category_id = categoryId
    if (q) params.q = q
    if (order) params.order = order
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
    setProducts((prev) => (reset ? mapped : [...prev, ...mapped]))
    setOffset((prev) => (reset ? mapped.length : prev + mapped.length))
    setHasMore(products.length === limit)
    setLoading(false)
  }

  useEffect(() => {
    setOffset(0)
    load(true)
  }, [collectionId, categoryId, q, order])

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
            className='px-4 py-2 border rounded'
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}

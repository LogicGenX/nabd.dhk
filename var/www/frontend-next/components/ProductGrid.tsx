'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { medusa } from '../lib/medusa'
import ProductCardSkeleton from './ProductCardSkeleton'

interface Product {
  id: string
  title: string
  thumbnail: string
  price: number
}

interface ProductGridProps {
  collectionId?: string
  categoryId?: string
  q?: string
  order?: string
  limit?: number
  offset?: number
}

export default function ProductGrid({
  collectionId,
  categoryId,
  q,
  order,
  limit,
  offset
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params: any = { limit, offset }
    if (collectionId) params.collection_id = collectionId
    if (categoryId) params.category_id = categoryId
    if (q) params.q = q
    if (order) params.order = order

    medusa.products
      .list(params)
      .then(({ products }) => {
        if (cancelled) return
        const mapped = products.map((p: any) => {
          const thumb =
            (typeof p.thumbnail === 'string' && p.thumbnail) ||
            p.images?.[0]?.url ||
            '/placeholder.svg'
          return {
            id: p.id,
            title: p.title,
            thumbnail: thumb,
            price: p.variants[0]?.prices[0]?.amount / 100 || 0
          }
        })
        setProducts(mapped)
      })
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [collectionId, categoryId, q, order, limit, offset])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products.map((p) => (
            <Link key={p.id} href={`/product/${p.id}`} className="group block">
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={p.thumbnail}
                  alt={p.title}
                  fill
                  sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="mt-2 text-sm">
                <h3>{p.title}</h3>
                <p className="font-semibold">${p.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
    </div>
  )
}

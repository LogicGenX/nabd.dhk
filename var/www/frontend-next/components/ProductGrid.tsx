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
  categoryId?: string
  order?: string
  search?: string
}

export default function ProductGrid({
  categoryId,
  order,
  search
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params: any = {}
    if (categoryId) params.category_id = categoryId
    if (order) params.order = order
    if (search) params.q = search

    medusa.products
      .list(params)
      .then(({ products }) => {
        const mapped = products.map((p: any) => ({
          id: p.id,
          title: p.title,
          thumbnail: p.thumbnail,
          price: p.variants[0]?.prices[0]?.amount / 100 || 0
        }))
        setProducts(mapped)
      })
      .finally(() => setLoading(false))
  }, [categoryId, order, search])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products.map((p) => (
            <Link key={p.id} href={`/product/${p.id}`} className="group block">
              <div className="relative h-56 overflow-hidden">
                {p.thumbnail ? (
                  <Image
                    src={p.thumbnail}
                    alt={p.title}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
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

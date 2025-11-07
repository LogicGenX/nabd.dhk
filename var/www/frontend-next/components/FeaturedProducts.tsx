'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { medusa } from '../lib/medusa'
import { mapProductSummary, type ProductSummary } from '../lib/products'
import { formatAmount } from '../lib/currency'
import ProductCardSkeleton from './ProductCardSkeleton'

export default function FeaturedProducts() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    medusa.products
      .list({ limit: 4 })
      .then(({ products }) => {
        const mapped = products.map((p: any) => mapProductSummary(p))
        setProducts(mapped)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))
        : products.map((p) => (
            <Link key={p.id} href={`/product/${p.id}`} className="group block">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={p.thumbnail}
                  alt={p.title}
                  fill
                  sizes="(max-width:768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="mt-2 text-sm">
                <h3>{p.title}</h3>
                <p className="font-semibold">{formatAmount(p.price)}</p>
              </div>
            </Link>
          ))}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { medusa } from '../lib/medusa'
import ProductCardSkeleton from './ProductCardSkeleton'

interface Product {
  id: string
  title: string
  thumbnail: string
  price: number
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    medusa.products
      .list({ limit: 4 })
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
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products.map((p) => (
            <a key={p.id} href={`/product/${p.id}`} className="group block">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={p.thumbnail}
                  alt={p.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="mt-2 text-sm">
                <h3>{p.title}</h3>
                <p className="font-semibold">${p.price.toFixed(2)}</p>
              </div>
            </a>
          ))}
    </div>
  )
}

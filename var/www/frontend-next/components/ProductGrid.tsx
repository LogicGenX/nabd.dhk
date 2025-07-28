'use client'
import { useEffect, useState } from 'react'
import { medusa } from '../lib/medusa'

interface Product {
  id: string
  title: string
  thumbnail: string
  price: number
}

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    medusa.products.list().then(({ products }) => {
      const mapped = products.map((p: any) => ({
        id: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
        price: p.variants[0]?.prices[0]?.amount / 100 || 0
      }))
      setProducts(mapped)
    })
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
      {products.map((p) => (
        <a key={p.id} href={`/product/${p.id}`} className="group block">
          <div className="overflow-hidden">
            <img src={p.thumbnail} className="object-cover w-full h-56 group-hover:scale-105 transition-transform" />
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

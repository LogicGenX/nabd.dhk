'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { medusa } from '../../../lib/medusa'
import { useCart } from '../../../lib/store'
import ProductPageSkeleton from '../../../components/ProductPageSkeleton'

interface Product {
  id: string
  title: string
  description: string
  images: { url: string }[]
  price: number
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const add = useCart((state) => state.add)

  useEffect(() => {
    medusa.products.retrieve(id).then(({ product }) => {
      setProduct({
        id: product.id,
        title: product.title,
        description: product.description,
        images: product.images || [],
        price: product.variants[0]?.prices[0]?.amount / 100 || 0
      })
    })
  }, [id])

  if (!product) {
    return <ProductPageSkeleton />
  }

  return (
    <main className="p-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {product.images.map((img, i) => (
            <div key={i} className="relative w-full aspect-square">
              {img.url ? (
                <Image
                  src={img.url}
                  alt={`${product.title} image ${i + 1}`}
                  fill
                  sizes="(max-width:768px) 100vw, 50vw"
                  className="object-cover"
                  priority={i === 0}
                />
              ) : (
                <div className="w-full h-full bg-gray-100" />
              )}
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold tracking-wider">{product.title}</h1>
          <p>{product.description}</p>
          <p className="text-xl font-semibold">${product.price.toFixed(2)}</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-16 border p-1"
            />
            <button
              className="px-4 py-2 bg-black text-white"
              onClick={() =>
                add({
                  id: product.id,
                  title: product.title,
                  price: product.price,
                  quantity,
                  image: product.images[0]?.url || '/placeholder.svg'
                })
              }
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}


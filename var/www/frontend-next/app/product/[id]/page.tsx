'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { medusa } from '../../../lib/medusa'
import { formatAmount } from '../../../lib/currency'
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
  const [selectedImage, setSelectedImage] = useState(0)
  const add = useCart((state) => state.add)

  useEffect(() => {
    medusa.products.retrieve(id).then(({ product }) => {
      setProduct({
        id: product.id,
        title: product.title,
        description: product.description,
        images: product.images || [],
        price: product.variants[0]?.prices[0]?.amount / 100 || 0,
      })
    })
  }, [id])

  if (!product) {
    return <ProductPageSkeleton />
  }

  return (
    <main className="p-8 md:p-16">
      <div className="flex flex-col md:flex-row gap-16">
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative w-full aspect-square">
            <Image
              src={product.images[selectedImage]?.url || '/placeholder.svg'}
              alt={`${product.title} image ${selectedImage + 1}`}
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 50vw"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`relative w-24 h-24 flex-shrink-0 border-2 rounded-md ${selectedImage === i ? 'border-black' : 'border-transparent'}`}
              >
                {img.url ? (
                  <Image
                    src={img.url}
                    alt={`${product.title} thumbnail ${i + 1}`}
                    fill
                    className="object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-8">
          <h1 className="text-4xl font-bold tracking-brand">{product.title}</h1>
          <p className="text-2xl font-semibold">{formatAmount(product.price)}</p>
          <p className="text-gray-700 leading-relaxed">{product.description}</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center border rounded">
              <button
                className="px-3 py-2"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="px-4">{quantity}</span>
              <button
                className="px-3 py-2"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              className="px-8 py-3 bg-accent text-white border border-accent rounded-md hover:bg-accent/90 transition-colors"
              onClick={() =>
                add({
                  id: product.id,
                  title: product.title,
                  price: product.price,
                  quantity,
                  image: product.images[0]?.url || '/placeholder.svg',
                })
              }
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

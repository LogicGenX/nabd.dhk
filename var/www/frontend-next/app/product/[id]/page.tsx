'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { medusa } from '../../../lib/medusa'
import { formatAmount } from '../../../lib/currency'
import { useCart } from '../../../lib/store'
import ProductPageSkeleton from '../../../components/ProductPageSkeleton'
import ProductRecommendations from '../../../components/ProductRecommendations'
import { FALLBACK_IMAGE } from '../../../lib/products'

interface Product {
  id: string
  title: string
  description: string
  images: { url: string }[]
  price: number
  variantId?: string
  variantTitle?: string | null
  collectionId?: string | null
  categoryIds: string[]
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const add = useCart((state) => state.add)

  useEffect(() => {
    let active = true
    medusa.products.retrieve(id).then(({ product }) => {
      if (!active) return
      const variants = Array.isArray(product.variants) ? product.variants : []
      const primaryVariant =
        variants.find((variant: any) => {
          if (!variant) return false
          if (!variant.manage_inventory) return true
          return typeof variant.inventory_quantity === 'number' ? variant.inventory_quantity > 0 : true
        }) || variants[0] || null
      setProduct({
        id: product.id,
        title: product.title,
        description: product.description,
        images: product.images || [],
        price: primaryVariant?.prices?.[0]?.amount ? primaryVariant.prices[0].amount / 100 : 0,
        variantId: primaryVariant?.id,
        variantTitle: primaryVariant?.title || null,
        collectionId: product.collection_id || null,
        categoryIds: Array.isArray(product.categories) ? product.categories.map((c: any) => c.id).filter(Boolean) : [],
      })
    })
    return () => {
      active = false
    }
  }, [id])

  const canAddToCart = useMemo(() => {
    return Boolean(product?.variantId)
  }, [product?.variantId])

  if (!product) {
    return <ProductPageSkeleton />
  }

  return (
    <main className="p-8 md:p-16">
      <div className="flex flex-col md:flex-row gap-16">
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative w-full aspect-square">
            <Image
              src={product.images[selectedImage]?.url || FALLBACK_IMAGE}
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
              className="px-8 py-3 bg-accent text-white border border-accent rounded-md hover:bg-accent/90 transition-colors disabled:cursor-not-allowed disabled:bg-gray-400 disabled:border-gray-400"
              disabled={!canAddToCart}
              onClick={() => {
                if (!product?.variantId) return
                add({
                  id: product.variantId,
                  productId: product.id,
                  title: product.title,
                  variantTitle: product.variantTitle,
                  price: product.price,
                  quantity,
                  image: product.images[0]?.url || FALLBACK_IMAGE,
                })
              }}
            >
              {canAddToCart ? 'Add to Cart' : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
      <ProductRecommendations
        productId={product.id}
        collectionId={product.collectionId}
        categoryIds={product.categoryIds}
      />
    </main>
  )
}

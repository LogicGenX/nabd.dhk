'use client'
import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { medusa } from '../../../lib/medusa'
import { useCart } from '../../../lib/store'

interface ProductOption {
  id: string
  title: string
  values: { value: string }[]
}

interface ProductVariant {
  id: string
  options: { option_id: string; value: string }[]
  prices: { amount: number }[]
}

interface Product {
  id: string
  title: string
  description: string
  images: { url: string }[]
  options: ProductOption[]
  variants: ProductVariant[]
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const add = useCart((state) => state.add)

  useEffect(() => {
    medusa.products.retrieve(id).then(({ product }) => {
      setProduct({
        id: product.id,
        title: product.title,
        description: product.description,
        images: product.images || [],
        options: product.options || [],
        variants: product.variants || []
      })
    })
  }, [id])

  useEffect(() => {
    if (!product) return
    const variant = product.variants.find((v) =>
      product.options.every((opt) => {
        const selected = selectedOptions[opt.id]
        const value = v.options.find((o) => o.option_id === opt.id)?.value
        return selected && value === selected
      })
    )
    setSelectedVariant(variant || null)
  }, [selectedOptions, product])

  if (!product) {
    return <main className="p-8">Loading...</main>
  }

  const variantPrice = selectedVariant?.prices[0]?.amount

  return (
    <main className="p-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <Swiper loop className="w-full">
            {product.images.map((img, i) => (
              <SwiperSlide key={i}>
                <img src={img.url} alt={product.title} className="w-full object-cover" />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold tracking-wider">{product.title}</h1>
          <p>{product.description}</p>
          {variantPrice && (
            <p className="text-xl font-semibold">${(variantPrice / 100).toFixed(2)}</p>
          )}
          {product.options.map((opt) => (
            <div key={opt.id} className="space-y-2">
              <h3 className="font-semibold">{opt.title}</h3>
              <div className="flex gap-2">
                {opt.values.map((v) => (
                  <button
                    key={v.value}
                    onClick={() =>
                      setSelectedOptions((prev) => ({ ...prev, [opt.id]: v.value }))
                    }
                    className={`px-3 py-1 border ${
                      selectedOptions[opt.id] === v.value
                        ? 'bg-black text-white'
                        : 'bg-white'
                    }`}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button
              className="border px-2 py-1"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              -
            </button>
            <span>{quantity}</span>
            <button className="border px-2 py-1" onClick={() => setQuantity((q) => q + 1)}>
              +
            </button>
          </div>
          <button
            className="px-4 py-2 bg-black text-white disabled:bg-gray-400"
            disabled={!selectedVariant}
            onClick={() =>
              selectedVariant &&
              add({
                title: product.title,
                price: (selectedVariant.prices[0]?.amount || 0) / 100,
                variantId: selectedVariant.id,
                quantity
              })
            }
          >
            Add to cart
          </button>
        </div>
      </div>
    </main>
  )
}


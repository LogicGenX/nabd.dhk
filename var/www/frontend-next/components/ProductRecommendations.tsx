'use client'

import { useEffect, useMemo, useState } from 'react'

import { medusa } from '../lib/medusa'
import { mapProductSummary, type ProductSummary } from '../lib/products'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'

interface Props {
  productId: string
  collectionId?: string | null
  categoryIds?: string[]
}

const MAX_RECOMMENDATIONS = 4

export default function ProductRecommendations({ productId, collectionId, categoryIds = [] }: Props) {
  const [items, setItems] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const stableCategoryIds = useMemo(() => categoryIds, [categoryIds])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const collected: ProductSummary[] = []
        const seen = new Set<string>([productId])

        const addProducts = (products: any[]) => {
          products.forEach((product) => {
            if (!product || seen.has(product.id)) return
            seen.add(product.id)
            collected.push(mapProductSummary(product))
          })
        }

        if (collectionId) {
          const { products } = await medusa.products.list({
            collection_id: [collectionId],
            limit: 8,
          })
          addProducts(products)
        }

        if (collected.length < MAX_RECOMMENDATIONS && stableCategoryIds.length) {
          const { products } = await medusa.products.list({
            category_id: stableCategoryIds,
            limit: 8,
          })
          addProducts(products)
        }

        if (!collected.length) {
          const { products } = await medusa.products.list({ limit: 8 })
          addProducts(products)
        }

        if (active) {
          setItems(collected.slice(0, MAX_RECOMMENDATIONS))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [productId, collectionId, stableCategoryIds])

  if (!items.length && !loading) {
    return null
  }

  return (
    <section className="mt-16 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">You might also like</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading
          ? Array.from({ length: MAX_RECOMMENDATIONS }).map((_, idx) => <ProductCardSkeleton key={idx} />)
          : items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  )
}

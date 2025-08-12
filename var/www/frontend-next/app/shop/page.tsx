"use client"

import { useState, Suspense } from "react"
import dynamic from "next/dynamic"
import ProductGrid from "../../components/ProductGrid"
import ProductCardSkeleton from "../../components/ProductCardSkeleton"

const CollectionsDropdown = dynamic(
  () => import("../../components/CollectionsDropdown"),
  { ssr: false }
)
const CategoriesDropdown = dynamic(
  () => import("../../components/CategoriesDropdown"),
  { ssr: false }
)

export default function ShopPage() {
  const [collection, setCollection] = useState("")
  const [category, setCategory] = useState("")
  const [order, setOrder] = useState("")
  const [q, setQ] = useState("")

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4 tracking-wider">Shop</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <CollectionsDropdown value={collection} onChange={setCollection} />
        <CategoriesDropdown value={category} onChange={setCategory} />

        <select
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Sort By</option>
          <option value="price">Price: Low to High</option>
          <option value="-price">Price: High to Low</option>
        </select>

        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          className="border p-2 rounded flex-1"
        />
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <ProductGrid
          collectionId={collection || undefined}
          categoryId={category || undefined}
          order={order || undefined}
          q={q || undefined}
        />
      </Suspense>
    </main>
  )
}

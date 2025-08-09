"use client"

import { useState } from "react"
import ProductGrid from "../../components/ProductGrid"
import CollectionsDropdown from "../../components/CollectionsDropdown"
import CategoriesDropdown from "../../components/CategoriesDropdown"

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

      <ProductGrid
        collectionId={collection || undefined}
        categoryId={category || undefined}
        order={order || undefined}
        q={q || undefined}
      />
    </main>
  )
}

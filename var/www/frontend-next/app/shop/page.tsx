import { useEffect, useState } from 'react'
import ProductGrid from '../../components/ProductGrid'
import { medusa } from '../../lib/medusa'

interface Category {
  id: string
  name: string
}

export default function ShopPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState('')
  const [order, setOrder] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    medusa.productCategories.list().then(({ product_categories }) => {
      setCategories(product_categories)
    })
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4 tracking-wider">Shop</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="border p-2 rounded flex-1"
        />
      </div>

      <ProductGrid
        categoryId={category || undefined}
        order={order || undefined}
        search={search || undefined}
      />
    </main>
  )
}

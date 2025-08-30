'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import ProductGrid from '../../components/ProductGrid'
import { medusa } from '../../lib/medusa'

const CollectionsFilter = dynamic(
  () => import('../../components/CollectionsFilter'),
  { ssr: false },
)
const CategoriesFilter = dynamic(
  () => import('../../components/CategoriesFilter'),
  { ssr: false },
)

export default function ShopPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [collection, setCollection] = useState<any>(null)
  const [category, setCategory] = useState<any>(null)
  const [order, setOrder] = useState('')
  const [q, setQ] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      const collectionId = searchParams.get('collection')
      const categoryId = searchParams.get('category')
      const tasks: Promise<void>[] = []
      if (collectionId) {
        tasks.push(
          medusa.collections
            .retrieve(collectionId)
            .then(async ({ collection }) => {
              const { count } = await medusa.products.list({
                collection_id: collectionId,
                limit: 1,
              })
              setCollection({ id: collection.id, title: collection.title, count })
            })
        )
      }
      if (categoryId) {
        tasks.push(
          medusa.productCategories
            .retrieve(categoryId)
            .then(async ({ product_category }) => {
              const { count } = await medusa.products.list({
                category_id: categoryId,
                limit: 1,
              })
              setCategory({
                id: product_category.id,
                name: product_category.name,
                count,
              })
            })
        )
      }
      await Promise.all(tasks)
      setReady(true)
    }
    init()
  }, [])

  useEffect(() => {
    if (!ready) return
    const params = new URLSearchParams()
    if (collection?.id) params.set('collection', collection.id)
    if (category?.id) params.set('category', category.id)
    if (order) params.set('order', order)
    if (q) params.set('q', q)
    const query = params.toString()
    const path = window.location.pathname
    router.replace(`${path}${query ? `?${query}` : ''}`)
  }, [collection, category, order, q, ready, router])

  const active = [
    collection && {
      label: `${collection.title} (${collection.count})`,
      clear: () => setCollection(null),
    },
    category && {
      label: `${category.name} (${category.count})`,
      clear: () => setCategory(null),
    },
    order && {
      label:
        order === 'price' ? 'Price: Low to High' : 'Price: High to Low',
      clear: () => setOrder(''),
    },
    q && { label: `Search: ${q}`, clear: () => setQ('') },
  ].filter(Boolean) as { label: string; clear: () => void }[]

  const clearAll = () => {
    setCollection(null)
    setCategory(null)
    setOrder('')
    setQ('')
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4 tracking-brand">Shop</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <CollectionsFilter selected={collection?.id} onSelect={setCollection} />
        <CategoriesFilter selected={category?.id} onSelect={setCategory} />

        <div className="flex gap-2">
          <button
            onClick={() => setOrder(order === 'price' ? '' : 'price')}
            className={`px-3 py-1 rounded-full border ${
              order === 'price' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Price: Low to High
          </button>
          <button
            onClick={() => setOrder(order === '-price' ? '' : '-price')}
            className={`px-3 py-1 rounded-full border ${
              order === '-price' ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            Price: High to Low
          </button>
        </div>

        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          className="border p-2 rounded flex-1"
        />
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {active.map((f, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full bg-gray-200 text-sm flex items-center"
            >
              {f.label}
              <button className="ml-2" onClick={f.clear}>
                ×
              </button>
            </span>
          ))}
          <button className="text-sm underline ml-auto" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {ready && (
        <ProductGrid
          collectionId={collection?.id}
          categoryId={category?.id}
          order={order || undefined}
          q={q || undefined}
        />
      )}
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import ProductGrid from '../../components/ProductGrid'
import { medusa } from '../../lib/medusa'
import FiltersDrawer from '../../components/FiltersDrawer'

const CollectionsFilter = dynamic(() => import('../../components/CollectionsFilter'), { ssr: false })
const CategoriesFilter = dynamic(() => import('../../components/CategoriesFilter'), { ssr: false })

export default function ShopPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [collection, setCollection] = useState<any>(null)
  const [category, setCategory] = useState<any>(null)
  const [order, setOrder] = useState('')
  const [q, setQ] = useState('')
  const [ready, setReady] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

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
      label: order === 'price' ? 'Price: Low to High' : 'Price: High to Low',
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
    <main className='container mx-auto px-4 py-6'>
      <div className='mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
        <div>
          <h1 className='text-3xl md:text-4xl font-bold tracking-brand'>Shop</h1>
          <p className='text-sm text-gray-600'>Refined essentials and elevated staples</p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='relative flex-1 md:w-80'>
            <input
              type='text'
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search products...'
              className='w-full border rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20'
            />
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
              🔎
            </span>
          </div>
          <select
            className='border rounded-full px-3 py-2 bg-white'
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value=''>Sort: Featured</option>
            <option value='price'>Price: Low to High</option>
            <option value='-price'>Price: High to Low</option>
          </select>
          <button className='md:hidden px-4 py-2 rounded-full border' onClick={() => setFiltersOpen(true)}>
            Filters
          </button>
        </div>
      </div>

      {/* Desktop filters */}
      <div className='hidden md:flex flex-col gap-4 mb-6'>
        <div className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur'>
          <CollectionsFilter selected={collection?.id} onSelect={setCollection} />
        </div>
        <div className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur'>
          <CategoriesFilter selected={category?.id} onSelect={setCategory} />
        </div>
      </div>

      {active.length > 0 && (
        <div className='flex flex-wrap items-center gap-2 mb-4'>
          {active.map((f, i) => (
            <span key={i} className='px-3 py-1 rounded-full bg-gray-100 border text-sm flex items-center'>
              {f.label}
              <button
                className='ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200'
                onClick={f.clear}
                aria-label={`Clear ${f.label}`}
              >
                ×
              </button>
            </span>
          ))}
          <button className='text-sm underline ml-auto' onClick={clearAll}>
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

      {/* Mobile filters drawer */}
      <FiltersDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <CollectionsFilter
          selected={collection?.id}
          onSelect={(opt) => {
            setCollection(opt)
            setFiltersOpen(false)
          }}
          variant='list'
        />
        <CategoriesFilter
          selected={category?.id}
          onSelect={(opt) => {
            setCategory(opt)
            setFiltersOpen(false)
          }}
          variant='list'
        />
      </FiltersDrawer>
    </main>
  )
}


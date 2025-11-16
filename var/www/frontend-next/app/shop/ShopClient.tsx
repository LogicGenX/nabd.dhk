'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import CategoryChips from '../../components/CategoryChips'
import FiltersDrawer from '../../components/FiltersDrawer'
import ProductGrid from '../../components/ProductGrid'
import { medusa } from '../../lib/medusa'

const CollectionsFilter = dynamic(() => import('../../components/CollectionsFilter'), { ssr: false })
const CategoriesFilter = dynamic(() => import('../../components/CategoriesFilter'), { ssr: false })

const sortOptions = [
  { value: '-created_at', label: 'Newest arrivals' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'title', label: 'Name (A to Z)' },
  { value: '-title', label: 'Name (Z to A)' },
]

interface CollectionSummary {
  id: string
  title: string
  count: number
}

interface CategorySummary {
  id: string
  name: string
  count: number
}

interface ShopClientProps {}

export default function ShopClient({}: ShopClientProps) {
  const [collection, setCollection] = useState<CollectionSummary | null>(null)
  const [category, setCategory] = useState<CategorySummary | null>(null)
  const [order, setOrder] = useState<string>('-created_at')
  const [q, setQ] = useState('')
  const [ready, setReady] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [heroCategories, setHeroCategories] = useState<CategorySummary[]>([])

  // UI-only extras (not yet wired to API)
  const [size, setSize] = useState<string>('')
  const [color, setColor] = useState<string>('')
  const [fit, setFit] = useState<string>('')
  const [fabric, setFabric] = useState<string>('')
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')

  const [initialQuery, setInitialQuery] = useState<{ collectionId: string | null; categoryId: string | null }>({
    collectionId: null,
    categoryId: null,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const nextOrder = params.get('order')
    const nextSearch = params.get('q')
    if (nextOrder && sortOptions.some((opt) => opt.value === nextOrder)) {
      setOrder(nextOrder)
    }
    if (nextSearch) {
      setQ(nextSearch)
    }
    setInitialQuery({
      collectionId: params.get('collection'),
      categoryId: params.get('category'),
    })
  }, [])

  useEffect(() => {
    let active = true
    const hydrateFromParams = async () => {
      const tasks: Promise<void>[] = []
      if (initialQuery.collectionId) {
        tasks.push(
          medusa.collections.retrieve(initialQuery.collectionId).then(async ({ collection: payload }) => {
            const { count } = await medusa.products.list({
              collection_id: [initialQuery.collectionId],
              limit: 1,
            })
            if (active) {
              setCollection({ id: payload.id, title: payload.title, count })
            }
          }),
        )
      }
      if (initialQuery.categoryId) {
        tasks.push(
          medusa.productCategories.retrieve(initialQuery.categoryId).then(async ({ product_category }) => {
            const { count } = await medusa.products.list({
              category_id: [initialQuery.categoryId],
              limit: 1,
            })
            if (active) {
              setCategory({ id: product_category.id, name: product_category.name, count })
            }
          }),
        )
      }
      await Promise.all(tasks)
      if (active) setReady(true)
    }
    hydrateFromParams()
    return () => {
      active = false
    }
  }, [initialQuery.collectionId, initialQuery.categoryId])

  useEffect(() => {
    if (!ready) return
    const params = new URLSearchParams()
    if (collection?.id) params.set('collection', collection.id)
    if (category?.id) params.set('category', category.id)
    if (order) params.set('order', order)
    if (q) params.set('q', q)
    const query = params.toString()
    const path = window.location.pathname
    const target = `${path}${query ? `?${query}` : ''}`
    window.history.replaceState(null, '', target)
  }, [collection, category, order, q, ready])

  useEffect(() => {
    let active = true
    const loadCollections = async () => {
      try {
        const { collections } = await medusa.collections.list()
        if (!active || !Array.isArray(collections)) return
        const mapped = collections.map((entry: any) => ({
          id: entry.id,
          title: entry.title,
          count: 0,
        }))
        setCollections(mapped)
      } catch (error) {
        console.warn('[shop] failed to load collections', error)
      }
    }
    loadCollections()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadCategories = async () => {
      try {
        const { product_categories } = await medusa.productCategories.list()
        if (!active || !Array.isArray(product_categories)) return
        const mapped = product_categories.slice(0, 6).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          count: typeof cat.product_count === 'number' ? cat.product_count : 0,
        }))
        setHeroCategories(mapped)
      } catch (error) {
        console.warn('[shop] failed to load categories', error)
      }
    }
    loadCategories()
    return () => {
      active = false
    }
  }, [])

  const activeFilters = useMemo(() => {
    const entries: { label: string; clear: () => void }[] = []
    if (collection) {
      entries.push({
        label: `${collection.title} (${collection.count})`,
        clear: () => setCollection(null),
      })
    }
    if (category) {
      entries.push({
        label: `${category.name} (${category.count})`,
        clear: () => setCategory(null),
      })
    }
    if (order) {
      const sortLabel = sortOptions.find((opt) => opt.value === order)?.label
      if (sortLabel) {
        entries.push({
          label: sortLabel,
          clear: () => setOrder('-created_at'),
        })
      }
    }
    if (q) {
      entries.push({
        label: `Search: ${q}`,
        clear: () => setQ(''),
      })
    }
    return entries
  }, [collection, category, order, q])

  const clearAll = () => {
    setCollection(null)
    setCategory(null)
    setOrder('-created_at')
    setQ('')
    setSize('')
    setColor('')
    setFit('')
    setFabric('')
    setPriceMin('')
    setPriceMax('')
  }

  const CollectionFilterComponent = CollectionsFilter
  const CategoryFilterComponent = CategoriesFilter

  return (
    <main className='container mx-auto px-4 py-6'>
      <div className='mb-6'>
        <nav className='text-sm text-gray-500 mb-2'>
          <Link href='/' className='underline-slide'>
            Home
          </Link>
          <span className='mx-2'>/</span>
          <span>Shop</span>
        </nav>
        <h1 className='text-3xl md:text-4xl font-bold tracking-brand mb-1'>Shop</h1>
        <p className='text-sm text-gray-600 mb-3'>Refined essentials and elevated staples</p>
        <CategoryChips
          items={heroCategories}
          selected={category?.id}
          onSelect={(opt) => setCategory(opt ? { ...opt, count: opt.count ?? 0 } : null)}
        />
      </div>

      <div className='flex gap-6'>
        <aside className='hidden md:block w-72 shrink-0'>
          <details open className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Collections</summary>
            <div className='pt-3'>
              <CollectionFilterComponent selected={collection?.id} onSelect={(opt) => setCollection(opt)} variant='list' options={collections} />
            </div>
          </details>
          <details open className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Category</summary>
            <div className='pt-3'>
              <CategoryFilterComponent selected={category?.id} onSelect={(opt) => setCategory(opt)} variant='list' />
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Size</summary>
            <div className='pt-3 grid grid-cols-4 gap-2'>
              {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 rounded border ${size === s ? 'bg-black text-white' : 'bg-white'}`}
                  onClick={() => setSize(size === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Color</summary>
            <div className='pt-3 flex flex-wrap gap-2'>
              {['Black', 'White', 'Navy', 'Beige', 'Olive'].map((c) => (
                <button
                  key={c}
                  className={`px-3 py-1 rounded-full border ${color === c ? 'bg-black text-white' : 'bg-white'}`}
                  onClick={() => setColor(color === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Price</summary>
            <div className='pt-3 flex items-center gap-2'>
              <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder='Min' className='w-20 border rounded px-2 py-1' />
              <span>-</span>
              <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder='Max' className='w-20 border rounded px-2 py-1' />
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Fabric</summary>
            <div className='pt-3 flex flex-wrap gap-2'>
              {['Cotton', 'Linen', 'Denim', 'Wool'].map((f) => (
                <button
                  key={f}
                  className={`px-3 py-1 rounded-full border ${fabric === f ? 'bg-black text-white' : 'bg-white'}`}
                  onClick={() => setFabric(fabric === f ? '' : f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur'>
            <summary className='cursor-pointer text-sm font-semibold'>Fit</summary>
            <div className='pt-3 flex flex-wrap gap-2'>
              {['Regular', 'Relaxed', 'Slim', 'Oversized'].map((f) => (
                <button
                  key={f}
                  className={`px-3 py-1 rounded-full border ${fit === f ? 'bg-black text-white' : 'bg-white'}`}
                  onClick={() => setFit(fit === f ? '' : f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </details>
        </aside>

        <div className='flex-1'>
          <div className='mb-4 flex items-center gap-2'>
            <div className='relative flex-1 md:w-80'>
              <input
                type='text'
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search products...'
                className='w-full border rounded-full pl-4 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20'
              />
            </div>
            <select
              className='border rounded-full px-3 py-2 bg-white'
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button className='md:hidden px-4 py-2 rounded-full border' onClick={() => setFiltersOpen(true)}>
              Filters
            </button>
          </div>

          {activeFilters.length > 0 && (
            <div className='flex flex-wrap items-center gap-2 mb-4'>
              {activeFilters.map((filter, index) => (
                <span key={index} className='px-3 py-1 rounded-full bg-gray-100 border text-sm flex items-center'>
                  {filter.label}
                  <button
                    className='ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200'
                    onClick={filter.clear}
                    aria-label={`Clear ${filter.label}`}
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
              order={order}
              q={q || undefined}
              size={size || undefined}
              color={color || undefined}
              priceMin={priceMin || undefined}
              priceMax={priceMax || undefined}
            />
          )}
        </div>
      </div>

      <FiltersDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <CollectionFilterComponent selected={collection?.id} onSelect={(opt) => setCollection(opt)} variant='list' />
        <CategoryFilterComponent selected={category?.id} onSelect={(opt) => setCategory(opt)} variant='list' />
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Size</h4>
          <div className='grid grid-cols-4 gap-2'>
            {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
              <button
                key={s}
                className={`px-2 py-1 rounded border ${size === s ? 'bg-black text-white' : 'bg-white'}`}
                onClick={() => setSize(size === s ? '' : s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Color</h4>
          <div className='flex flex-wrap gap-2'>
            {['Black', 'White', 'Navy', 'Beige', 'Olive'].map((c) => (
              <button
                key={c}
                className={`px-3 py-1 rounded-full border ${color === c ? 'bg-black text-white' : 'bg-white'}`}
                onClick={() => setColor(color === c ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Price</h4>
          <div className='flex items-center gap-2'>
            <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder='Min' className='w-20 border rounded px-2 py-1' />
            <span>-</span>
            <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder='Max' className='w-20 border rounded px-2 py-1' />
          </div>
        </div>
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Fabric</h4>
          <div className='flex flex-wrap gap-2'>
            {['Cotton', 'Linen', 'Denim', 'Wool'].map((f) => (
              <button
                key={f}
                className={`px-3 py-1 rounded-full border ${fabric === f ? 'bg-black text-white' : 'bg-white'}`}
                onClick={() => setFabric(fabric === f ? '' : f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Fit</h4>
          <div className='flex flex-wrap gap-2'>
            {['Regular', 'Relaxed', 'Slim', 'Oversized'].map((f) => (
              <button
                key={f}
                className={`px-3 py-1 rounded-full border ${fit === f ? 'bg-black text-white' : 'bg-white'}`}
                onClick={() => setFit(fit === f ? '' : f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </FiltersDrawer>
    </main>
  )
}

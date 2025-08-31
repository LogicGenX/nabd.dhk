'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import ProductGrid from '../../components/ProductGrid'
import { medusa } from '../../lib/medusa'
import FiltersDrawer from '../../components/FiltersDrawer'
import Link from 'next/link'
import CategoryChips from '../../components/CategoryChips'

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

  // UI-only extras (not yet wired to API)
  const [size, setSize] = useState<string>('')
  const [color, setColor] = useState<string>('')
  const [fit, setFit] = useState<string>('')
  const [fabric, setFabric] = useState<string>('')
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')

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
            }),
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
            }),
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
      {/* Hero strip */}
      <div className='mb-6'>
        <nav className='text-sm text-gray-500 mb-2'>
          <Link href='/' className='underline-slide'>Home</Link>
          <span className='mx-2'>/</span>
          <span>Shop</span>
        </nav>
        <h1 className='text-3xl md:text-4xl font-bold tracking-brand mb-1'>Shop</h1>
        <p className='text-sm text-gray-600 mb-3'>Refined essentials and elevated staples</p>
        <CategoryChips selected={category?.id} onSelect={setCategory} />
      </div>

      <div className='flex gap-6'>
        {/* Left sidebar (desktop) */}
        <aside className='hidden md:block w-72 shrink-0'>
          <details open className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Collections</summary>
            <div className='pt-3'>
              <CollectionsFilter selected={collection?.id} onSelect={setCollection} variant='list' />
            </div>
          </details>
          <details open className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Category</summary>
            <div className='pt-3'>
              <CategoriesFilter selected={category?.id} onSelect={setCategory} variant='list' />
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Size</summary>
            <div className='pt-3 grid grid-cols-4 gap-2'>
              {['XS','S','M','L','XL'].map((s) => (
                <button key={s} className={`px-2 py-1 rounded border ${size===s?'bg-black text-white':'bg-white'}`} onClick={()=>setSize(size===s?'':s)}>{s}</button>
              ))}
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Color</summary>
            <div className='pt-3 flex flex-wrap gap-2'>
              {['Black','White','Navy','Beige','Olive'].map((c) => (
                <button key={c} className={`px-3 py-1 rounded-full border ${color===c?'bg-black text-white':'bg-white'}`} onClick={()=>setColor(color===c?'':c)}>{c}</button>
              ))}
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Price</summary>
            <div className='pt-3 flex items-center gap-2'>
              <input value={priceMin} onChange={(e)=>setPriceMin(e.target.value)} placeholder='Min' className='w-20 border rounded px-2 py-1'/>
              <span>-</span>
              <input value={priceMax} onChange={(e)=>setPriceMax(e.target.value)} placeholder='Max' className='w-20 border rounded px-2 py-1'/>
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur mb-3'>
            <summary className='cursor-pointer text-sm font-semibold'>Fabric</summary>
            <div className='pt-3 flex flex-wrap gap-2'>
              {['Cotton','Linen','Denim','Wool'].map((f) => (
                <button key={f} className={`px-3 py-1 rounded-full border ${fabric===f?'bg-black text-white':'bg-white'}`} onClick={()=>setFabric(fabric===f?'':f)}>{f}</button>
              ))}
            </div>
          </details>
          <details className='rounded-2xl border border-black/5 shadow-sm p-3 bg-white/70 backdrop-blur'>
            <summary className='cursor-pointer text-sm font-semibold'>Fit</summary>
            <div className='pt-3 flex flex-wrap gap-2'>
              {['Regular','Relaxed','Slim','Oversized'].map((f) => (
                <button key={f} className={`px-3 py-1 rounded-full border ${fit===f?'bg-black text-white':'bg-white'}`} onClick={()=>setFit(fit===f?'':f)}>{f}</button>
              ))}
            </div>
          </details>
        </aside>

        {/* Main content */}
        <div className='flex-1'>
          {/* Top bar: search, sort, mobile filter button */}
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
              <option value=''>Sort: Featured</option>
              <option value='price'>Price: Low to High</option>
              <option value='-price'>Price: High to Low</option>
            </select>
            <button className='md:hidden px-4 py-2 rounded-full border' onClick={() => setFiltersOpen(true)}>
              Filters
            </button>
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
                    A-
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
        </div>
      </div>

      {/* Mobile filters drawer */}
      <FiltersDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <CollectionsFilter
          selected={collection?.id}
          onSelect={(opt) => {
            setCollection(opt)
          }}
          variant='list'
        />
        <CategoriesFilter
          selected={category?.id}
          onSelect={(opt) => {
            setCategory(opt)
          }}
          variant='list'
        />
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Size</h4>
          <div className='grid grid-cols-4 gap-2'>
            {['XS','S','M','L','XL'].map((s) => (
              <button key={s} className={`px-2 py-1 rounded border ${size===s?'bg-black text-white':'bg-white'}`} onClick={()=>setSize(size===s?'':s)}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Color</h4>
          <div className='flex flex-wrap gap-2'>
            {['Black','White','Navy','Beige','Olive'].map((c) => (
              <button key={c} className={`px-3 py-1 rounded-full border ${color===c?'bg-black text-white':'bg-white'}`} onClick={()=>setColor(color===c?'':c)}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Price</h4>
          <div className='flex items-center gap-2'>
            <input value={priceMin} onChange={(e)=>setPriceMin(e.target.value)} placeholder='Min' className='w-20 border rounded px-2 py-1'/>
            <span>-</span>
            <input value={priceMax} onChange={(e)=>setPriceMax(e.target.value)} placeholder='Max' className='w-20 border rounded px-2 py-1'/>
          </div>
        </div>
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Fabric</h4>
          <div className='flex flex-wrap gap-2'>
            {['Cotton','Linen','Denim','Wool'].map((f) => (
              <button key={f} className={`px-3 py-1 rounded-full border ${fabric===f?'bg-black text-white':'bg-white'}`} onClick={()=>setFabric(fabric===f?'':f)}>{f}</button>
            ))}
          </div>
        </div>
        <div>
          <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Fit</h4>
          <div className='flex flex-wrap gap-2'>
            {['Regular','Relaxed','Slim','Oversized'].map((f) => (
              <button key={f} className={`px-3 py-1 rounded-full border ${fit===f?'bg-black text-white':'bg-white'}`} onClick={()=>setFit(fit===f?'':f)}>{f}</button>
            ))}
          </div>
        </div>
      </FiltersDrawer>
    </main>
  )
}


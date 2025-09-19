'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildQuery, liteFetch } from '../../../../lib/admin-lite'
import { formatAmount } from '../../../../lib/currency'

interface LiteProductSummary {
  id: string
  title: string
  status: string
  collection?: { id: string; title: string } | null
  categories: { id: string; name: string }[]
  price: number
  currency_code: string
  thumbnail?: string | null
  updated_at: string
}

interface ProductListResponse {
  products: LiteProductSummary[]
  count: number
  limit: number
  offset: number
}

interface CatalogResponse {
  collections: { id: string; title: string }[]
  categories: { id: string; name: string }[]
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'proposed', label: 'Proposed' },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<LiteProductSummary[]>([])
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<CatalogResponse>({ collections: [], categories: [] })

  const loadCatalog = useCallback(async () => {
    try {
      const data = await liteFetch<CatalogResponse>('catalog')
      setCatalog(data)
    } catch (err) {
      // ignore, filters will simply be empty
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  const fetchProducts = useCallback(
    async (newOffset = 0) => {
      setLoading(true)
      setError(null)
      try {
        const query = buildQuery({
          limit,
          offset: newOffset,
          q: search || undefined,
          status: status || undefined,
          collection_id: collectionId || undefined,
        })
        const data = await liteFetch<ProductListResponse>('products' + query)
        setProducts(data.products)
        setCount(data.count)
        setOffset(data.offset)
        setLimit(data.limit)
      } catch (err: any) {
        setError(err?.message || 'Failed to load products')
      } finally {
        setLoading(false)
      }
    },
    [limit, search, status, collectionId]
  )

  useEffect(() => {
    fetchProducts(0)
  }, [fetchProducts])

  const pages = Math.ceil(count / limit) || 1
  const currentPage = Math.floor(offset / limit) + 1

  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit
    fetchProducts(newOffset)
  }

  const collectionOptions = useMemo(
    () => [
      { id: '', title: 'All collections' },
      ...catalog.collections,
    ],
    [catalog.collections]
  )

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-900'>Products</h2>
          <p className='text-sm text-slate-600'>Create, update, and publish catalog items</p>
        </div>
        <Link
          href='/admin/lite/products/new'
          className='rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800'
        >
          Add product
        </Link>
      </div>

      <form
        className='grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4'
        onSubmit={(event) => {
          event.preventDefault()
          fetchProducts(0)
        }}
      >
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Title or handle'
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          />
        </label>
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Collection
          <select
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          >
            {collectionOptions.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type='submit'
          className='mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400'
          disabled={loading}
        >
          Apply
        </button>
      </form>

      {error && <p className='rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700'>{error}</p>}

      <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='min-w-full divide-y divide-slate-200 text-sm'>
          <thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3 text-left'>Product</th>
              <th className='px-4 py-3 text-left'>Status</th>
              <th className='px-4 py-3 text-left'>Collection</th>
              <th className='px-4 py-3 text-left'>Categories</th>
              <th className='px-4 py-3 text-left'>Price</th>
              <th className='px-4 py-3 text-left'>Updated</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {products.map((product) => (
              <tr key={product.id} className='hover:bg-slate-50'>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt='' className='h-12 w-12 rounded object-cover' />
                    ) : (
                      <div className='h-12 w-12 rounded bg-slate-100' />
                    )}
                    <div className='flex flex-col'>
                      <Link href={'/admin/lite/products/' + product.id} className='font-medium text-slate-900 hover:underline'>
                        {product.title}
                      </Link>
                      <span className='text-xs text-slate-500'>{product.id}</span>
                    </div>
                  </div>
                </td>
                <td className='px-4 py-3 capitalize text-slate-700'>{product.status.replace(/_/g, ' ')}</td>
                <td className='px-4 py-3 text-slate-700'>{product.collection?.title || '—'}</td>
                <td className='px-4 py-3 text-xs text-slate-500'>
                  {product.categories.length ? product.categories.map((category) => category.name).join(', ') : '—'}
                </td>
                <td className='px-4 py-3 font-medium text-slate-900'>{formatAmount(product.price / 100)}</td>
                <td className='px-4 py-3 text-slate-600'>{new Date(product.updated_at).toLocaleString()}</td>
              </tr>
            ))}
            {!products.length && !loading && (
              <tr>
                <td colSpan={6} className='px-4 py-8 text-center text-slate-500'>
                  No products match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className='px-4 py-3 text-sm text-slate-500'>Loading products…</p>}
      </div>

      <div className='flex items-center justify-between text-sm text-slate-600'>
        <span>Showing {products.length} of {count} products</span>
        <div className='flex items-center gap-2'>
          <button
            className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400'
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
          >
            Previous
          </button>
          <span>Page {currentPage} of {pages}</span>
          <button
            className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400'
            onClick={() => goToPage(Math.min(pages, currentPage + 1))}
            disabled={currentPage >= pages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}

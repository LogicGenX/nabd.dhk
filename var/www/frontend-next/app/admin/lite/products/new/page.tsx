'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProductForm, { type CatalogData, type ProductFormSubmit } from '../../../../../components/admin-lite/ProductForm'
import { liteFetch } from '../../../../../lib/admin-lite'

const emptyProduct = {
  title: '',
  description: '',
  handle: '',
  status: 'published',
  collection_id: '',
  category_ids: [] as string[],
  price: 0,
  images: [] as string[],
  thumbnail: '',
}

export default function CreateProductPage() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<CatalogData>({ collections: [], categories: [], sizes: [] })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await liteFetch<CatalogData>('catalog')
      setCatalog(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load catalog data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  const handleSubmit = async (payload: ProductFormSubmit) => {
    setSubmitting(true)
    setError(null)
    try {
      const response = await liteFetch<{ product: { id: string } }>('products', {
        method: 'POST',
        json: payload,
      })
      router.replace('/admin/lite/products/' + response.product.id)
    } catch (err: any) {
      setError(err?.message || 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className='text-sm text-slate-500'>Loading catalog…</p>
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-1'>
        <button className='text-sm text-slate-500 hover:underline' onClick={() => router.back()}>
          ← Back
        </button>
        <h2 className='text-2xl font-semibold text-slate-900'>Create product</h2>
        <p className='text-sm text-slate-600'>Add a new item to the catalog</p>
      </div>

      <ProductForm
        mode='create'
        catalog={catalog}
        initial={emptyProduct}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
      />
    </section>
  )
}


'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProductForm, { type CatalogData, type EditableProduct, type ProductFormSubmit } from '../../../../../components/admin-lite/ProductForm'
import { liteFetch } from '../../../../../lib/admin-lite'

interface LiteProductDetail extends EditableProduct {
  status: string
  currency_code: string
  created_at: string
  updated_at: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const [catalog, setCatalog] = useState<CatalogData>({ collections: [], categories: [] })
  const [product, setProduct] = useState<LiteProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError(null)
    try {
      const [catalogData, productData] = await Promise.all([
        liteFetch<CatalogData>('catalog'),
        liteFetch<{ product: LiteProductDetail }>('products/' + productId),
      ])
      setCatalog(catalogData)
      setProduct(productData.product)
    } catch (err: any) {
      setError(err?.message || 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (payload: ProductFormSubmit) => {
    if (!productId) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const response = await liteFetch<{ product: LiteProductDetail }>('products/' + productId, {
        method: 'PUT',
        json: payload,
      })
      setProduct(response.product)
      setMessage('Product updated successfully')
    } catch (err: any) {
      setError(err?.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className='text-sm text-slate-500'>Loading product…</p>
  }

  if (!product) {
    return (
      <div className='space-y-3'>
        <p className='text-sm text-rose-600'>{error || 'Product not found.'}</p>
        <button className='text-sm text-slate-700 underline' onClick={() => router.push('/admin/lite/products')}>
          Return to products list
        </button>
      </div>
    )
  }

  const editable: EditableProduct = {
    id: product.id,
    title: product.title,
    description: product.description,
    handle: product.handle,
    status: product.status,
    collection_id: product.collection_id || undefined,
    category_ids: product.category_ids || [],
    price: product.price,
    images: product.images,
    thumbnail: product.thumbnail,
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-1'>
        <button className='text-sm text-slate-500 hover:underline' onClick={() => router.back()}>
          ← Back
        </button>
        <h2 className='text-2xl font-semibold text-slate-900'>Edit product</h2>
        <p className='text-sm text-slate-600'>Last updated {new Date(product.updated_at).toLocaleString()}</p>
      </div>

      <ProductForm
        mode='edit'
        catalog={catalog}
        initial={editable}
        submitting={saving}
        message={message}
        error={error}
        onSubmit={handleSubmit}
      />
    </section>
  )
}

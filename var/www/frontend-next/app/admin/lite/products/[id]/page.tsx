'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProductForm, {
  type CatalogData,
  type EditableProduct,
  type ProductFormSubmit,
} from '../../../../../components/admin-lite/ProductForm'
import { liteFetch } from '../../../../../lib/admin-lite'

interface LiteProductOption {
  id: string
  title: string
}

interface LiteProductVariantOption {
  id?: string
  option_id?: string
  value?: string | null
}

interface LiteProductVariant {
  id: string
  title?: string | null
  sku?: string | null
  inventory_quantity?: number | null
  manage_inventory: boolean
  allow_backorder: boolean
  options: LiteProductVariantOption[]
}

interface LiteProductDetail extends EditableProduct {
  status: string
  currency_code: string
  created_at: string
  updated_at: string
  in_stock: boolean
  options: LiteProductOption[]
  variants: LiteProductVariant[]
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const [catalog, setCatalog] = useState<CatalogData>({ collections: [], categories: [], sizes: [], colors: [] })
  const [product, setProduct] = useState<LiteProductDetail | null>(null)
  const [variantDrafts, setVariantDrafts] = useState<LiteProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inventoryUpdating, setInventoryUpdating] = useState(false)
  const [variantSavingId, setVariantSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshCatalog = useCallback(async () => {
    const data = await liteFetch<CatalogData>('catalog')
    setCatalog(data)
  }, [])

  const load = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError(null)
    try {
      const [, productData] = await Promise.all([
        refreshCatalog(),
        liteFetch<{ product: LiteProductDetail }>('products/' + productId),
      ])
      setProduct(productData.product)
      setVariantDrafts(
        Array.isArray(productData.product.variants)
          ? productData.product.variants.map((variant) => ({
              ...variant,
              inventory_quantity:
                typeof variant.inventory_quantity === 'number' ? variant.inventory_quantity : 0,
              options: Array.isArray(variant.options)
                ? variant.options.map((option) => ({ ...option }))
                : [],
            }))
          : []
      )
    } catch (err: any) {
      setError(err?.message || 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [productId, refreshCatalog])

  useEffect(() => {
    load()
  }, [load])

  const sizeOption = useMemo(() => {
    if (!product?.options) return null
    return product.options.find((option) => option?.title && option.title.toLowerCase() === 'size') || null
  }, [product?.options])

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
      setVariantDrafts(
        Array.isArray(response.product.variants)
          ? response.product.variants.map((variant) => ({
              ...variant,
              inventory_quantity:
                typeof variant.inventory_quantity === 'number' ? variant.inventory_quantity : 0,
              options: Array.isArray(variant.options)
                ? variant.options.map((option) => ({ ...option }))
                : [],
            }))
          : []
      )
    } catch (err: any) {
      setError(err?.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStock = async () => {
    if (!productId || !product) return
    setInventoryUpdating(true)
    setError(null)
    try {
      const response = await liteFetch<{ product: LiteProductDetail }>('products/' + productId + '/inventory', {
        method: 'PATCH',
        json: { in_stock: !product.in_stock },
      })
      setProduct(response.product)
      setVariantDrafts(
        Array.isArray(response.product.variants)
          ? response.product.variants.map((variant) => ({
              ...variant,
              inventory_quantity:
                typeof variant.inventory_quantity === 'number' ? variant.inventory_quantity : 0,
              options: Array.isArray(variant.options)
                ? variant.options.map((option) => ({ ...option }))
                : [],
            }))
          : []
      )
      setMessage('Inventory status updated')
    } catch (err: any) {
      setError(err?.message || 'Failed to update inventory status')
    } finally {
      setInventoryUpdating(false)
    }
  }

  const updateVariantDraft = (variantId: string, patch: Partial<LiteProductVariant>) => {
    setVariantDrafts((prev) =>
      prev.map((variant) => (variant.id === variantId ? { ...variant, ...patch } : variant))
    )
  }

  const updateVariantSize = (variantId: string, value: string) => {
    if (!sizeOption) return
    setVariantDrafts((prev) =>
      prev.map((variant) => {
        if (variant.id !== variantId) return variant
        const options = Array.isArray(variant.options) ? [...variant.options] : []
        const idx = options.findIndex((option) => option?.option_id === sizeOption.id)
        if (idx >= 0) {
          options[idx] = { ...options[idx], option_id: sizeOption.id, value }
        } else {
          options.push({ option_id: sizeOption.id, value })
        }
        return { ...variant, options }
      })
    )
  }

  const addSizeOption = async () => {
    if (!productId) return
    try {
      await liteFetch('products/' + productId + '/options', {
        method: 'POST',
        json: { title: 'Size' },
      })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to create Size option')
    }
  }

  const saveVariant = async (variantId: string) => {
    const draft = variantDrafts.find((variant) => variant.id === variantId)
    if (!draft) return
    setVariantSavingId(variantId)
    setError(null)
    try {
      const payload = {
        manage_inventory: !!draft.manage_inventory,
        allow_backorder: !!draft.allow_backorder,
        inventory_quantity:
          draft.manage_inventory ? Number.isFinite(Number(draft.inventory_quantity)) ? Number(draft.inventory_quantity) : 0 : draft.inventory_quantity ?? 0,
        options: Array.isArray(draft.options)
          ? draft.options
              .filter((option) => option.option_id)
              .map((option) => ({ option_id: option.option_id || option.id, value: option.value || '' }))
          : [],
      }
      await liteFetch('variants/' + variantId, {
        method: 'PUT',
        json: payload,
      })
      await load()
      setMessage('Variant inventory updated')
    } catch (err: any) {
      setError(err?.message || 'Failed to update variant')
    } finally {
      setVariantSavingId(null)
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

  const baseVariant = Array.isArray(product.variants) && product.variants.length ? product.variants[0] : null
  const variantDefaults = product.variant_defaults
    ? {
        manage_inventory: !!product.variant_defaults.manage_inventory,
        allow_backorder: !!product.variant_defaults.allow_backorder,
        inventory_quantity:
          typeof product.variant_defaults.inventory_quantity === 'number'
            ? product.variant_defaults.inventory_quantity
            : typeof baseVariant?.inventory_quantity === 'number'
              ? baseVariant.inventory_quantity
              : 0,
        sku: product.variant_defaults.sku || baseVariant?.sku || null,
      }
    : {
        manage_inventory: baseVariant?.manage_inventory ?? true,
        allow_backorder: baseVariant?.allow_backorder ?? false,
        inventory_quantity:
          typeof baseVariant?.inventory_quantity === 'number' ? baseVariant.inventory_quantity : 0,
        sku: baseVariant?.sku || null,
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
    available_sizes: Array.isArray(product.available_sizes) ? product.available_sizes : [],
    available_colors: Array.isArray(product.available_colors) ? product.available_colors : [],
    variant_defaults: variantDefaults,
  }

  const getVariantSizeValue = (variant: LiteProductVariant) => {
    if (!sizeOption) return ''
    const match = variant.options?.find((option) => option?.option_id === sizeOption.id)
    return (match?.value as string) || ''
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
        onRefreshCatalog={refreshCatalog}
      />

      <div className='space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-slate-900'>Inventory</h3>
            <p className='text-sm text-slate-500'>Adjust availability per variant or toggle all stock.</p>
          </div>
          <button
            type='button'
            onClick={handleToggleStock}
            disabled={inventoryUpdating}
            className={[
              'rounded-full px-4 py-2 text-sm font-medium text-white shadow transition',
              product.in_stock
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-500',
              inventoryUpdating ? 'cursor-not-allowed opacity-60' : '',
            ].filter(Boolean).join(' ')}
          >
            {product.in_stock ? 'Mark out of stock' : 'Mark in stock'}
          </button>
        </div>

        {!sizeOption && (
          <button
            type='button'
            onClick={addSizeOption}
            className='rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100'
          >
            Add Size option
          </button>
        )}

        <div className='space-y-4'>
          {variantDrafts.map((variant) => (
            <div key={variant.id} className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
              <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>{variant.title || 'Variant'}</p>
                  <p className='text-xs text-slate-500'>SKU: {variant.sku || '—'}</p>
                </div>
                <div className='flex items-center gap-3'>
                  <label className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    <input
                      type='checkbox'
                      checked={variant.manage_inventory}
                      onChange={(event) =>
                        updateVariantDraft(variant.id, { manage_inventory: event.target.checked })
                      }
                      className='h-4 w-4'
                    />
                    Manage inventory
                  </label>
                  <label className='flex items-center gap-2 text-xs text-slate-500'>
                    <input
                      type='checkbox'
                      checked={variant.allow_backorder}
                      onChange={(event) =>
                        updateVariantDraft(variant.id, { allow_backorder: event.target.checked })
                      }
                      className='h-4 w-4'
                    />
                    Allow backorder
                  </label>
                </div>
              </div>

              <div className='mt-4 grid gap-4 md:grid-cols-3'>
                <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Quantity
                  <input
                    type='number'
                    min={0}
                    value={variant.inventory_quantity ?? 0}
                    onChange={(event) =>
                      updateVariantDraft(variant.id, {
                        inventory_quantity: Number(event.target.value),
                      })
                    }
                    className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                    disabled={!variant.manage_inventory}
                  />
                </label>
                {sizeOption ? (
                  <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    Size
                    <input
                      value={getVariantSizeValue(variant)}
                      onChange={(event) => updateVariantSize(variant.id, event.target.value)}
                      className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
                      placeholder='Enter size'
                    />
                  </label>
                ) : (
                  <div className='text-xs text-slate-500'>Create a Size option to manage size values.</div>
                )}
                <div className='flex items-end'>
                  <button
                    type='button'
                    onClick={() => saveVariant(variant.id)}
                    disabled={variantSavingId === variant.id}
                    className='w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60'
                  >
                    {variantSavingId === variant.id ? 'Saving…' : 'Save variant'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!variantDrafts.length && (
            <p className='text-sm text-slate-500'>No variants available.</p>
          )}
        </div>
      </div>
    </section>
  )
}

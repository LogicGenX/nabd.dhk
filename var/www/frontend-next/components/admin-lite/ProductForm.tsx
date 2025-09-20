'use client'

import { useEffect, useMemo, useState } from 'react'
import ProductImageManager from './ProductImageManager'

interface CatalogCollection {
  id: string
  title: string
}

interface CatalogCategory {
  id: string
  name: string
}

export interface CatalogData {
  collections: CatalogCollection[]
  categories: CatalogCategory[]
  sizes: string[]
}

export interface EditableProduct {
  id?: string
  title: string
  description?: string | null
  handle?: string | null
  status?: string
  collection_id?: string | null
  category_ids: string[]
  price: number
  images: string[]
  thumbnail?: string | null
}

export interface ProductFormSubmit {
  title: string
  description?: string | null
  handle?: string | null
  status: string
  collection_id: string
  category_ids: string[]
  price: number
  images: string[]
  thumbnail?: string | null
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  catalog: CatalogData
  initial?: EditableProduct
  submitting?: boolean
  message?: string | null
  error?: string | null
  onSubmit: (payload: ProductFormSubmit) => Promise<void>
}

const statusOptions = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'proposed', label: 'Proposed' },
]

export default function ProductForm({
  mode,
  catalog,
  initial,
  submitting,
  message,
  error,
  onSubmit,
}: ProductFormProps) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [handle, setHandle] = useState(initial?.handle || '')
  const [status, setStatus] = useState(initial?.status || 'published')
  const [collectionId, setCollectionId] = useState(initial?.collection_id || '')
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.category_ids || [])
  const [priceInput, setPriceInput] = useState(() => {
    const value = initial?.price ?? 0
    return value ? (value / 100).toFixed(2) : ''
  })
  const [images, setImages] = useState<string[]>(initial?.images || [])
  const [thumbnail, setThumbnail] = useState<string | undefined | null>(initial?.thumbnail || (initial?.images && initial.images[0]) || '')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!initial) return
    setTitle(initial.title || '')
    setDescription(initial.description || '')
    setHandle(initial.handle || '')
    setStatus(initial.status || 'published')
    setCollectionId(initial.collection_id || '')
    setCategoryIds(initial.category_ids || [])
    setPriceInput(initial.price ? (initial.price / 100).toFixed(2) : '')
    setImages(initial.images || [])
    setThumbnail(initial.thumbnail || (initial.images && initial.images[0]) || '')
  }, [initial?.id])

  useEffect(() => {
    if (!collectionId && catalog.collections.length) {
      setCollectionId(catalog.collections[0].id)
    }
  }, [catalog.collections, collectionId])

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((entry) => entry !== id)
      }
      return [...prev, id]
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    const numericPrice = Number(priceInput) * 100
    if (!title.trim()) {
      setLocalError('Title is required')
      return
    }
    if (!collectionId) {
      setLocalError('Collection is required')
      return
    }
    if (!categoryIds.length) {
      setLocalError('Select at least one category')
      return
    }
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setLocalError('Enter a valid price')
      return
    }
    try {
      await onSubmit({
        title: title.trim(),
        description: description || null,
        handle: handle || undefined,
        status,
        collection_id: collectionId,
        category_ids: categoryIds,
        price: Math.round(numericPrice),
        images,
        thumbnail: thumbnail || (images[0] || undefined),
      })
    } catch (err: any) {
      setLocalError(err?.message || 'Unable to save product')
    }
  }

  const thumbnailValue = thumbnail || (images[0] || '')

  const selectedCollectionLabel = useMemo(() => {
    return catalog.collections.find((collection) => collection.id === collectionId)?.title || 'Unassigned'
  }, [catalog.collections, collectionId])

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2'>
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
            placeholder='Product title'
          />
        </label>
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Handle
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
            placeholder='Optional handle'
          />
        </label>
      </div>

      <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
        Description
        <textarea
          rows={4}
          value={description || ''}
          onChange={(event) => setDescription(event.target.value)}
          className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          placeholder='Short description'
        />
      </label>

      <div className='grid gap-4 md:grid-cols-3'>
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
            {catalog.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.title}
              </option>
            ))}
          </select>
        </label>
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Price (BDT)
          <input
            value={priceInput}
            onChange={(event) => setPriceInput(event.target.value)}
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
            placeholder='0.00'
            inputMode='decimal'
          />
        </label>
      </div>

      <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
        <h3 className='text-sm font-semibold text-slate-700'>Categories</h3>
        <p className='text-xs text-slate-500'>Select at least one category to satisfy storefront filters.</p>
        <div className='mt-3 flex flex-wrap gap-3'>
          {catalog.categories.map((category) => {
            const checked = categoryIds.includes(category.id)
            return (
              <label key={category.id} className='flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm'>
                <input
                  type='checkbox'
                  className='h-4 w-4'
                  checked={checked}
                  onChange={() => toggleCategory(category.id)}
                />
                <span>{category.name}</span>
              </label>
            )
          })}
          {!catalog.categories.length && <span className='text-sm text-slate-500'>No categories available.</span>}
        </div>
      </div>

      <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-sm font-semibold text-slate-700'>Media</h3>
            <p className='text-xs text-slate-500'>Thumbnail: {thumbnailValue || 'None selected'}</p>
          </div>
          <div className='text-xs text-slate-500'>Collection: {selectedCollectionLabel}</div>
        </div>
        <ProductImageManager
          images={images}
          thumbnail={thumbnailValue}
          onChange={setImages}
          onSelectThumbnail={(url) => setThumbnail(url)}
        />
      </div>

      {(localError || error) && <p className='rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700'>{localError || error}</p>}
      {message && <p className='rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>{message}</p>}

      <div className='flex justify-end gap-3'>
        <button
          type='submit'
          className='rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400'
          disabled={!!submitting}
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}


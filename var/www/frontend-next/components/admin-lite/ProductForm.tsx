'use client'

import { useEffect, useMemo, useState } from 'react'
import { liteFetch } from '../../lib/admin-lite'
import ProductImageManager from './ProductImageManager'

interface CatalogCollection {
  id: string
  title: string
  handle?: string
}

interface CatalogCategory {
  id: string
  name: string
  handle?: string
}

export interface CatalogData {
  collections: CatalogCollection[]
  categories: CatalogCategory[]
  sizes: string[]
  colors: string[]
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
  available_sizes?: string[]
  available_colors?: string[]
  variant_defaults?: {
    manage_inventory: boolean
    allow_backorder: boolean
    inventory_quantity: number
    sku?: string | null
  }
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
  available_sizes?: string[]
  available_colors?: string[]
  variant?: {
    manage_inventory: boolean
    allow_backorder: boolean
    inventory_quantity: number
    sku?: string | null
  }
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  catalog: CatalogData
  initial?: EditableProduct
  submitting?: boolean
  message?: string | null
  error?: string | null
  onSubmit: (payload: ProductFormSubmit) => Promise<void>
  onRefreshCatalog?: () => Promise<void>
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
  onRefreshCatalog,
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
  const [collections, setCollections] = useState<CatalogCollection[]>(catalog.collections)
  const [categoriesList, setCategoriesList] = useState<CatalogCategory[]>(catalog.categories)
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initial?.available_sizes || [])
  const [selectedColors, setSelectedColors] = useState<string[]>(initial?.available_colors || [])
  const [newSizeValue, setNewSizeValue] = useState('')
  const [newColorValue, setNewColorValue] = useState('')
  const [manageInventory, setManageInventory] = useState(initial?.variant_defaults?.manage_inventory ?? true)
  const [allowBackorder, setAllowBackorder] = useState(initial?.variant_defaults?.allow_backorder ?? false)
  const [inventoryQuantityInput, setInventoryQuantityInput] = useState(() => {
    const value = initial?.variant_defaults?.inventory_quantity ?? 0
    return String(value)
  })
  const [skuInput, setSkuInput] = useState(initial?.variant_defaults?.sku || '')
  const [showCollectionForm, setShowCollectionForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCollectionTitle, setNewCollectionTitle] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [creatingCategory, setCreatingCategory] = useState(false)

  const dedupeValues = (values: (string | null | undefined)[]) => {
    const seen = new Set<string>()
    const result: string[] = []
    values.forEach((value) => {
      if (typeof value !== 'string') return
      const trimmed = value.trim()
      if (!trimmed) return
      const key = trimmed.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      result.push(trimmed)
    })
    return result
  }

  const sizesList = useMemo(() => {
    const base = Array.isArray(catalog.sizes) ? catalog.sizes : []
    return dedupeValues([...base, ...selectedSizes])
  }, [catalog.sizes, selectedSizes])

  const colorsList = useMemo(() => {
    const base = Array.isArray(catalog.colors) ? catalog.colors : []
    return dedupeValues([...base, ...selectedColors])
  }, [catalog.colors, selectedColors])

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
    setSelectedSizes(dedupeValues(initial.available_sizes || []))
    setSelectedColors(dedupeValues(initial.available_colors || []))
    setManageInventory(initial.variant_defaults?.manage_inventory ?? true)
    setAllowBackorder(initial.variant_defaults?.allow_backorder ?? false)
    const inventory = initial.variant_defaults?.inventory_quantity ?? 0
    setInventoryQuantityInput(String(inventory))
    setSkuInput(initial.variant_defaults?.sku || '')
    setNewSizeValue('')
    setNewColorValue('')
  }, [initial?.id])

  useEffect(() => {
    setCollections(catalog.collections)
  }, [catalog.collections])

  useEffect(() => {
    setCategoriesList(catalog.categories)
  }, [catalog.categories])

  useEffect(() => {
    if (!collectionId && collections.length) {
      setCollectionId(collections[0].id)
    }
  }, [collections, collectionId])

  useEffect(() => {
    if (collectionId && !collections.some((collection) => collection.id === collectionId)) {
      setCollectionId(collections[0]?.id || '')
    }
  }, [collectionId, collections])

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((entry) => entry !== id)
      }
      return [...prev, id]
    })
  }

  const toggleSize = (value: string) => {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (!trimmed) return
    setSelectedSizes((prev) => {
      const exists = prev.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())
      if (exists) {
        return prev.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())
      }
      return [...prev, trimmed]
    })
  }

  const toggleColor = (value: string) => {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (!trimmed) return
    setSelectedColors((prev) => {
      const exists = prev.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())
      if (exists) {
        return prev.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())
      }
      return [...prev, trimmed]
    })
  }

  const addSizeValue = () => {
    const trimmed = newSizeValue.trim()
    if (!trimmed) return
    setSelectedSizes((prev) => {
      if (prev.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) return prev
      return [...prev, trimmed]
    })
    setNewSizeValue('')
  }

  const addColorValue = () => {
    const trimmed = newColorValue.trim()
    if (!trimmed) return
    setSelectedColors((prev) => {
      if (prev.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) return prev
      return [...prev, trimmed]
    })
    setNewColorValue('')
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
    const quantityNumber = Number(inventoryQuantityInput)
    if (Number.isNaN(quantityNumber) || quantityNumber < 0) {
      setLocalError('Enter a valid inventory quantity')
      return
    }

    const roundedQuantity = Math.round(quantityNumber)
    const sanitizedSizes = dedupeValues(selectedSizes)
    const sanitizedColors = dedupeValues(selectedColors)
    const trimmedImages = images
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => Boolean(value))
    const variantPayload: ProductFormSubmit['variant'] = {
      manage_inventory: !!manageInventory,
      allow_backorder: !!allowBackorder,
      inventory_quantity: roundedQuantity,
    }
    const trimmedSku = skuInput.trim()
    if (trimmedSku) variantPayload.sku = trimmedSku

    try {
      await onSubmit({
        title: title.trim(),
        description: description || null,
        handle: handle || undefined,
        status,
        collection_id: collectionId,
        category_ids: categoryIds,
        price: Math.round(numericPrice),
        images: trimmedImages,
        thumbnail: thumbnail || (trimmedImages[0] || undefined),
        available_sizes: sanitizedSizes,
        available_colors: sanitizedColors,
        variant: variantPayload,
      })
    } catch (err: any) {
      setLocalError(err?.message || 'Unable to save product')
    }
  }

  const thumbnailValue = thumbnail || (images[0] || '')

  const selectedCollectionLabel = useMemo(() => {
    return collections.find((collection) => collection.id === collectionId)?.title || 'Unassigned'
  }, [collections, collectionId])

  const handleCreateCollection = async () => {
    const trimmed = newCollectionTitle.trim()
    if (!trimmed) {
      setLocalError('Collection title is required')
      return
    }
    setCreatingCollection(true)
    setLocalError(null)
    try {
      const response = await liteFetch<{ collection: CatalogCollection }>('catalog/collections', {
        method: 'POST',
        json: { title: trimmed },
      })
      setCollections((prev) => {
        if (prev.some((entry) => entry.id === response.collection.id)) {
          return prev
        }
        return [...prev, response.collection]
      })
      setCollectionId(response.collection.id)
      setNewCollectionTitle('')
      setShowCollectionForm(false)
      onRefreshCatalog?.().catch(() => {})
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to create collection')
    } finally {
      setCreatingCollection(false)
    }
  }

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      setLocalError('Category name is required')
      return
    }
    setCreatingCategory(true)
    setLocalError(null)
    try {
      const response = await liteFetch<{ category: CatalogCategory }>('catalog/categories', {
        method: 'POST',
        json: { name: trimmed },
      })
      setCategoriesList((prev) => {
        if (prev.some((entry) => entry.id === response.category.id)) {
          return prev
        }
        return [...prev, response.category]
      })
      setCategoryIds((prev) => (prev.includes(response.category.id) ? prev : [...prev, response.category.id]))
      setNewCategoryName('')
      setShowCategoryForm(false)
      onRefreshCatalog?.().catch(() => {})
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

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
        <div className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          <span>Collection</span>
          <select
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          >
            {collections.length ? (
              collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title}
                </option>
              ))
            ) : (
              <option value=''>No collections available</option>
            )}
          </select>
          {showCollectionForm ? (
            <div className='mt-2 flex flex-col gap-2 text-[11px] font-normal normal-case text-slate-600'>
              <input
                value={newCollectionTitle}
                onChange={(event) => setNewCollectionTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleCreateCollection()
                  }
                }}
                className='rounded-lg border border-slate-300 px-2 py-1 text-sm'
                placeholder='Collection title'
              />
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={handleCreateCollection}
                  className='rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:bg-slate-500'
                  disabled={creatingCollection}
                >
                  {creatingCollection ? 'Creating…' : 'Save collection'}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setShowCollectionForm(false)
                    setNewCollectionTitle('')
                  }}
                  className='rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100'
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type='button'
              onClick={() => {
                setShowCollectionForm(true)
                setLocalError(null)
              }}
              className='mt-2 self-start text-xs font-normal normal-case text-slate-600 hover:underline'
            >
              + New collection
            </button>
          )}
        </div>
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
        <div className='flex flex-col gap-1'>
          <h3 className='text-sm font-semibold text-slate-700'>Inventory</h3>
          <p className='text-xs text-slate-500'>Set default inventory settings for the primary variant.</p>
        </div>
        <div className='mt-3 flex flex-wrap gap-4'>
          <label className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <input
              type='checkbox'
              checked={manageInventory}
              onChange={(event) => setManageInventory(event.target.checked)}
              className='h-4 w-4'
            />
            Manage inventory
          </label>
          <label className='flex items-center gap-2 text-xs text-slate-500'>
            <input
              type='checkbox'
              checked={allowBackorder}
              onChange={(event) => setAllowBackorder(event.target.checked)}
              className='h-4 w-4'
            />
            Allow backorder
          </label>
        </div>
        <div className='mt-4 grid gap-4 md:grid-cols-3'>
          <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
            Quantity
            <input
              type='number'
              min={0}
              value={inventoryQuantityInput}
              onChange={(event) => setInventoryQuantityInput(event.target.value)}
              className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
              disabled={!manageInventory}
            />
          </label>
          <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
            SKU
            <input
              value={skuInput}
              onChange={(event) => setSkuInput(event.target.value)}
              className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
              placeholder='e.g. SKU-001'
            />
          </label>
        </div>
      </div>

      <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='space-y-4'>
          <div>
            <div className='flex flex-col gap-1 md:flex-row md:items-center md:justify-between'>
              <div>
                <h3 className='text-sm font-semibold text-slate-700'>Available sizes</h3>
                <p className='text-xs text-slate-500'>Pick size labels customers can filter by.</p>
              </div>
              <div className='flex gap-2'>
                <input
                  value={newSizeValue}
                  onChange={(event) => setNewSizeValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addSizeValue()
                    }
                  }}
                  className='rounded-lg border border-slate-300 px-3 py-1 text-sm'
                  placeholder='Add size'
                />
                <button
                  type='button'
                  onClick={addSizeValue}
                  className='rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100'
                >
                  Add
                </button>
              </div>
            </div>
            <div className='mt-3 flex flex-wrap gap-3'>
              {sizesList.map((size) => {
                const checked = selectedSizes.some((entry) => entry.toLowerCase() === size.toLowerCase())
                return (
                  <label key={size} className='flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm'>
                    <input
                      type='checkbox'
                      className='h-4 w-4'
                      checked={checked}
                      onChange={() => toggleSize(size)}
                    />
                    <span>{size}</span>
                  </label>
                )
              })}
              {!sizesList.length && <span className='text-sm text-slate-500'>No sizes defined.</span>}
            </div>
          </div>

          <div className='border-t border-slate-100 pt-4'>
            <div className='flex flex-col gap-1 md:flex-row md:items-center md:justify-between'>
              <div>
                <h3 className='text-sm font-semibold text-slate-700'>Available colors</h3>
                <p className='text-xs text-slate-500'>Track color variants available for merchandising.</p>
              </div>
              <div className='flex gap-2'>
                <input
                  value={newColorValue}
                  onChange={(event) => setNewColorValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addColorValue()
                    }
                  }}
                  className='rounded-lg border border-slate-300 px-3 py-1 text-sm'
                  placeholder='Add color'
                />
                <button
                  type='button'
                  onClick={addColorValue}
                  className='rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100'
                >
                  Add
                </button>
              </div>
            </div>
            <div className='mt-3 flex flex-wrap gap-3'>
              {colorsList.map((color) => {
                const checked = selectedColors.some((entry) => entry.toLowerCase() === color.toLowerCase())
                return (
                  <label key={color} className='flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm'>
                    <input
                      type='checkbox'
                      className='h-4 w-4'
                      checked={checked}
                      onChange={() => toggleColor(color)}
                    />
                    <span>{color}</span>
                  </label>
                )
              })}
              {!colorsList.length && <span className='text-sm text-slate-500'>No colors defined.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
          <div>
            <h3 className='text-sm font-semibold text-slate-700'>Categories</h3>
            <p className='text-xs text-slate-500'>Select at least one category to satisfy storefront filters.</p>
          </div>
          {!showCategoryForm && (
            <button
              type='button'
              onClick={() => {
                setShowCategoryForm(true)
                setLocalError(null)
              }}
              className='self-start text-xs font-normal normal-case text-slate-600 hover:underline'
            >
              + New category
            </button>
          )}
        </div>
        {showCategoryForm && (
          <div className='mt-3 flex flex-col gap-2 md:flex-row md:items-center'>
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleCreateCategory()
                }
              }}
              className='rounded-lg border border-slate-300 px-3 py-1 text-sm'
              placeholder='Category name'
            />
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={handleCreateCategory}
                className='rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:bg-slate-500'
                disabled={creatingCategory}
              >
                {creatingCategory ? 'Creating…' : 'Save category'}
              </button>
              <button
                type='button'
                onClick={() => {
                  setShowCategoryForm(false)
                  setNewCategoryName('')
                }}
                className='rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100'
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className='mt-3 flex flex-wrap gap-3'>
          {categoriesList.map((category) => {
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
          {!categoriesList.length && <span className='text-sm text-slate-500'>No categories available.</span>}
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

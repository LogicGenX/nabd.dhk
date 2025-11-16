import { cache } from 'react'

import { medusa } from './medusa'

export interface CollectionSummary {
  id: string
  title: string
  count: number
}

export interface CategorySummary {
  id: string
  name: string
  count: number
}

const MAX_FACET_ENTRIES = 24

const fetchProductCount = async (selector: Record<string, unknown>) => {
  try {
    const { count } = await medusa.products.list({
      limit: 1,
      ...selector,
    })
    return typeof count === 'number' ? count : 0
  } catch (error) {
    console.warn('[catalog] Unable to resolve product count', selector, error)
    return 0
  }
}

const normalizeCollection = async (collection: any): Promise<CollectionSummary> => {
  const count = await fetchProductCount({ collection_id: [collection.id] })
  return {
    id: collection.id,
    title: collection.title,
    count,
  }
}

const normalizeCategory = async (category: any): Promise<CategorySummary> => {
  const count = await fetchProductCount({ category_id: [category.id] })
  return {
    id: category.id,
    name: category.name,
    count,
  }
}

const sliceForFacets = <T>(items: T[]) => items.slice(0, MAX_FACET_ENTRIES)

export const getCollectionSummaries = cache(async (): Promise<CollectionSummary[]> => {
  try {
    const { collections } = await medusa.collections.list()
    if (!Array.isArray(collections) || !collections.length) {
      return []
    }
    const limited = sliceForFacets(collections)
    const enriched = await Promise.all(limited.map(normalizeCollection))
    return enriched.sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('[catalog] Failed to list collections', error)
    return []
  }
})

export const getCategorySummaries = cache(async (): Promise<CategorySummary[]> => {
  try {
    const { product_categories } = await medusa.productCategories.list()
    if (!Array.isArray(product_categories) || !product_categories.length) {
      return []
    }
    const limited = sliceForFacets(product_categories)
    const enriched = await Promise.all(limited.map(normalizeCategory))
    return enriched.sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('[catalog] Failed to list categories', error)
    return []
  }
})

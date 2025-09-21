import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  buildAdminUrl,
  buildUpstreamHeaders,
  clearAuthCookie,
} from '../_utils/backend'

export const runtime = 'nodejs'

const unauthorized = () => {
  const res = NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  clearAuthCookie(res)
  return res
}

interface FetchJsonOptions {
  optional?: boolean
}

const fetchJson = async (
  req: NextRequest,
  token: string,
  path: string,
  options: FetchJsonOptions = {}
) => {
  const url = buildAdminUrl(path)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: buildUpstreamHeaders(req, token),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[admin-lite] catalog upstream failed', error)
    throw NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
  }

  if (response.status === 401) {
    throw unauthorized()
  }

  if (response.status === 404 && options.optional) {
    console.warn('[admin-lite] catalog upstream optional resource missing', path)
    return null
  }

  if (!response.ok) {
    const text = await response.text()
    console.error('[admin-lite] catalog upstream error', response.status, text)
    throw NextResponse.json({ message: 'Backend request failed', status: response.status }, { status: 502 })
  }

  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('[admin-lite] catalog parse error', error)
    throw NextResponse.json({ message: 'Invalid backend response' }, { status: 502 })
  }
}

const extractSizes = (productsPayload: any) => {
  if (!productsPayload || !Array.isArray(productsPayload.products)) return []
  const sizes = new Map<string, string>()

  for (const product of productsPayload.products) {
    const options = Array.isArray(product?.options) ? product.options : []
    const sizeOption = options.find((option) =>
      typeof option?.title === 'string' && option.title.toLowerCase() === 'size'
    )
    if (!sizeOption || !sizeOption.id) continue

    const variants = Array.isArray(product?.variants) ? product.variants : []
    for (const variant of variants) {
      const variantOptions = Array.isArray(variant?.options) ? variant.options : []
      const match = variantOptions.find((opt) => opt?.option_id === sizeOption.id)
      const value = typeof match?.value === 'string' ? match.value.trim() : ''
      if (!value) continue
      const key = value.toLowerCase()
      if (!sizes.has(key)) sizes.set(key, value)
    }
  }

  return Array.from(sizes.values()).sort((a, b) => a.localeCompare(b))
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  try {
    const [collectionsPayload, categoriesPayload, productsPayload] = await Promise.all([
      fetchJson(req, token, 'collections?limit=1000'),
      fetchJson(req, token, 'product-categories?limit=1000', { optional: true }),
      fetchJson(req, token, 'products?limit=1000&expand=options,variants,variants.options'),
    ])

    const collections = Array.isArray(collectionsPayload?.collections)
      ? collectionsPayload.collections
          .map((entry: any) => ({ id: entry?.id, title: entry?.title }))
          .filter((entry: any) => entry.id && entry.title)
      : []

    const categories = Array.isArray(categoriesPayload?.product_categories)
      ? categoriesPayload.product_categories
          .map((entry: any) => ({ id: entry?.id, name: entry?.name || entry?.title }))
          .filter((entry: any) => entry.id && entry.name)
      : []

    const sizes = extractSizes(productsPayload)

    return NextResponse.json({ collections, categories, sizes })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('[admin-lite] catalog handler failed', error)
    return NextResponse.json({ message: 'Catalog request failed' }, { status: 502 })
  }
}

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
  const url = buildAdminUrl(path, req)
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

const collectStringValues = (values: unknown) => {
  if (!Array.isArray(values)) return []
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => Boolean(value))
}

const extractSizes = (productsPayload: any) => {
  if (!productsPayload || !Array.isArray(productsPayload.products)) return []
  const sizes = new Map<string, string>()

  for (const product of productsPayload.products) {
    if (Array.isArray(product?.available_sizes)) {
      for (const entry of collectStringValues(product.available_sizes)) {
        const key = entry.toLowerCase()
        if (!sizes.has(key)) sizes.set(key, entry)
      }
    }
    if (Array.isArray(product?.metadata?.available_sizes)) {
      for (const entry of collectStringValues(product.metadata.available_sizes)) {
        const key = entry.toLowerCase()
        if (!sizes.has(key)) sizes.set(key, entry)
      }
    }

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

const extractColors = (productsPayload: any) => {
  if (!productsPayload || !Array.isArray(productsPayload.products)) return []
  const colors = new Map<string, string>()

  for (const product of productsPayload.products) {
    if (Array.isArray(product?.available_colors)) {
      for (const entry of collectStringValues(product.available_colors)) {
        const key = entry.toLowerCase()
        if (!colors.has(key)) colors.set(key, entry)
      }
    }
    if (Array.isArray(product?.metadata?.available_colors)) {
      for (const entry of collectStringValues(product.metadata.available_colors)) {
        const key = entry.toLowerCase()
        if (!colors.has(key)) colors.set(key, entry)
      }
    }
  }

  return Array.from(colors.values()).sort((a, b) => a.localeCompare(b))
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  try {
    const catalogPayload = await fetchJson(req, token, 'lite/catalog')

    const collections = Array.isArray(catalogPayload?.collections)
      ? catalogPayload.collections
          .map((entry: any) => ({ id: entry?.id, title: entry?.title || entry?.name || entry?.handle }))
          .filter((entry: any) => entry.id && entry.title)
      : []

    const categories = Array.isArray(catalogPayload?.categories)
      ? catalogPayload.categories
          .map((entry: any) => ({ id: entry?.id, name: entry?.name || entry?.title }))
          .filter((entry: any) => entry.id && entry.name)
      : []

    let sizes: string[] = Array.isArray(catalogPayload?.sizes)
      ? catalogPayload.sizes
          .filter((value: unknown): value is string => typeof value === 'string' && Boolean(value.trim()))
          .map((value: string) => value.trim())
      : []

    let colors: string[] = Array.isArray(catalogPayload?.colors)
      ? catalogPayload.colors
          .filter((value: unknown): value is string => typeof value === 'string' && Boolean(value.trim()))
          .map((value: string) => value.trim())
      : []

    if (!sizes.length || !colors.length) {
      const productsPayload = await fetchJson(
        req,
        token,
        'lite/products?limit=1000&expand=options,variants,variants.options',
        { optional: true }
      )
      if (productsPayload) {
        if (!sizes.length) sizes = extractSizes(productsPayload)
        if (!colors.length) colors = extractColors(productsPayload)
      }
    }

    return NextResponse.json({ collections, categories, sizes, colors })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('[admin-lite] catalog handler failed', error)
    return NextResponse.json({ message: 'Catalog request failed' }, { status: 502 })
  }
}

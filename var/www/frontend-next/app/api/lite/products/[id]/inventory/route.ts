import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  buildAdminUrl,
  buildUpstreamHeaders,
  clearAuthCookie,
} from '../../../_utils/backend'

export const runtime = 'nodejs'

const DEFAULT_CURRENCY = (process.env.ADMIN_LITE_CURRENCY_CODE || 'bdt').toLowerCase()
const PRODUCT_EXPAND = 'options,variants,variants.options,variants.prices,images,categories,collection'

const unauthorized = () => {
  const res = NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  clearAuthCookie(res)
  return res
}

const safeParse = (value: string) => {
  try {
    return value ? JSON.parse(value) : null
  } catch (error) {
    return null
  }
}

const backendError = (label: string, response: Response, body: string) => {
  console.error('[admin-lite] ' + label + ' upstream error', response.status, body)
  const details = safeParse(body)
  const message = typeof details?.message === 'string' ? details.message : 'Backend request failed'
  const status = response.status >= 400 && response.status < 500 ? response.status : 502
  return NextResponse.json({ message, details }, { status })
}

const parseJsonResponse = async (label: string, response: Response) => {
  const text = await response.text()
  if (!response.ok) {
    throw backendError(label, response, text)
  }
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('[admin-lite] ' + label + ' parse error', error)
    throw NextResponse.json({ message: 'Invalid backend response' }, { status: 502 })
  }
}

const buildUpstreamRequest = async (
  req: NextRequest,
  token: string,
  path: string,
  init: RequestInit = {}
) => {
  const url = buildAdminUrl(path, req)
  const headers = buildUpstreamHeaders(req, token, init.headers)
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const requestInit: RequestInit = {
    cache: 'no-store',
    redirect: 'manual',
    ...init,
    headers,
  }

  let response: Response
  try {
    response = await fetch(url, requestInit)
  } catch (error) {
    console.error('[admin-lite] inventory upstream request failed', error)
    throw NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
  }

  if (response.status === 401) {
    throw unauthorized()
  }

  return response
}

const fetchProduct = async (req: NextRequest, token: string, productId: string) => {
  const response = await buildUpstreamRequest(
    req,
    token,
    'products/' + encodeURIComponent(productId) + '?expand=' + PRODUCT_EXPAND
  )
  const payload = await parseJsonResponse('inventory product fetch', response)
  const product = payload?.product ?? payload
  if (!product || typeof product !== 'object') {
    console.error('[admin-lite] inventory product missing in payload', payload)
    throw NextResponse.json({ message: 'Product not found' }, { status: 404 })
  }
  return product
}

const ensureVariantUpdate = async (label: string, response: Response) => {
  if (response.ok) return
  const text = await response.text()
  throw backendError(label, response, text)
}

const normalizeVariants = (variants: any[]) => {
  if (!Array.isArray(variants)) return []
  return variants.map((variant) => ({
    id: variant?.id,
    title: variant?.title,
    sku: variant?.sku,
    inventory_quantity:
      typeof variant?.inventory_quantity === 'number'
        ? variant.inventory_quantity
        : Number(variant?.inventory_quantity) || 0,
    manage_inventory: !!variant?.manage_inventory,
    allow_backorder: !!variant?.allow_backorder,
    options: Array.isArray(variant?.options)
      ? variant.options.map((option: any) => ({
          id: option?.id,
          option_id: option?.option_id || option?.id,
          value: option?.value ?? '',
        }))
      : [],
    prices: Array.isArray(variant?.prices)
      ? variant.prices.map((price: any) => ({
          id: price?.id,
          currency_code: price?.currency_code,
          amount:
            typeof price?.amount === 'number' ? price.amount : Number(price?.amount) || 0,
        }))
      : [],
  }))
}

const mapPrice = (product: any) => {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  const primary = variants[0]
  if (!primary || !Array.isArray(primary.prices) || !primary.prices.length) {
    return { amount: 0, currency_code: DEFAULT_CURRENCY, variant_id: primary?.id || null }
  }
  const prioritized =
    primary.prices.find((price: any) => {
      const code = typeof price?.currency_code === 'string' ? price.currency_code.toLowerCase() : ''
      return code === DEFAULT_CURRENCY
    }) || primary.prices[0]
  const amount =
    typeof prioritized?.amount === 'number'
      ? prioritized.amount
      : Number(prioritized?.amount) || 0
  return {
    amount,
    currency_code: prioritized?.currency_code || DEFAULT_CURRENCY,
    variant_id: primary?.id || null,
  }
}

const normalizeImages = (images: any[]) => {
  if (!Array.isArray(images)) return { urls: [], nodes: [] }
  const nodes = images
    .map((image) => {
      if (!image) return null
      if (typeof image === 'string') return { id: null, url: image }
      if (typeof image.url === 'string' && image.url.trim()) {
        return { id: image.id ?? null, url: image.url }
      }
      return null
    })
    .filter(Boolean)
  return {
    urls: nodes.map((node) => node!.url),
    nodes,
  }
}

const transformProduct = (product: any) => {
  const variants = normalizeVariants(product?.variants)
  const price = mapPrice(product)
  const images = normalizeImages(product?.images)
  const categories = Array.isArray(product?.categories)
    ? product.categories
        .map((category: any) => ({ id: category?.id, name: category?.name || category?.title }))
        .filter((category) => category.id && category.name)
    : []
  const categoryIds = categories.map((category) => category.id)
  const options = Array.isArray(product?.options)
    ? product.options
        .map((option: any) => ({ id: option?.id, title: option?.title }))
        .filter((option) => option.id && option.title)
    : []
  const collection = product?.collection
    ? { id: product.collection.id, title: product.collection.title }
    : null
  const thumbnail = typeof product?.thumbnail === 'string' && product.thumbnail.trim()
    ? product.thumbnail
    : images.urls[0] || null
  const inStock = variants.some((variant) => {
    if (!variant.manage_inventory) return true
    return (variant.inventory_quantity ?? 0) > 0
  })

  return {
    id: product?.id,
    title: product?.title,
    handle: product?.handle,
    status: product?.status,
    description: product?.description,
    collection,
    collection_id: product?.collection_id || collection?.id || null,
    categories,
    category_ids: categoryIds,
    thumbnail,
    images: images.urls,
    image_objects: images.nodes,
    options,
    variants,
    in_stock: inStock,
    price: price.amount,
    currency_code: price.currency_code,
    variant_id: price.variant_id,
    sku: variants[0]?.sku || null,
    metadata: product?.metadata ?? null,
    created_at: product?.created_at,
    updated_at: product?.updated_at,
  }
}

export const PATCH = async (
  req: NextRequest,
  context: { params: { id?: string } }
) => {
  const productId = context.params?.id
  if (!productId) {
    return NextResponse.json({ message: 'Product id is required' }, { status: 400 })
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  let body: any
  try {
    body = await req.json()
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 })
  }

  const inStock = body?.in_stock
  if (typeof inStock !== 'boolean') {
    return NextResponse.json({ message: 'in_stock must be boolean' }, { status: 400 })
  }

  const variantIdsInput = Array.isArray(body?.variantIds) ? body.variantIds : body?.variant_ids
  const variantIds = Array.isArray(variantIdsInput)
    ? variantIdsInput.filter((value: any) => typeof value === 'string' && value.trim())
    : null

  try {
    const product = await fetchProduct(req, token, productId)
    const variants = Array.isArray(product?.variants) ? product.variants : []
    const targets = variantIds && variantIds.length
      ? variants.filter((variant: any) => variantIds.includes(variant.id))
      : variants

    if (!targets.length) {
      return NextResponse.json({ message: 'No matching variants found for update' }, { status: 400 })
    }

    await Promise.all(
      targets.map(async (variant: any) => {
        const quantity =
          typeof variant?.inventory_quantity === 'number'
            ? variant.inventory_quantity
            : Number(variant?.inventory_quantity) || 0
        const payload = {
          manage_inventory: true,
          inventory_quantity: inStock ? (quantity > 0 ? quantity : 1) : 0,
          allow_backorder: inStock ? !!variant?.allow_backorder : false,
        }
        const response = await buildUpstreamRequest(req, token, 'variants/' + variant.id, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        await ensureVariantUpdate('inventory variant update', response)
      })
    )

    const updated = await fetchProduct(req, token, productId)
    const normalized = transformProduct(updated)
    return NextResponse.json({ product: normalized })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('[admin-lite] inventory handler failed', error)
    return NextResponse.json({ message: 'Inventory update failed' }, { status: 502 })
  }
}

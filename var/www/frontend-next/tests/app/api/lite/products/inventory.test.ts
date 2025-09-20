import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '../../../../../app/api/lite/products/[id]/inventory/route'
import { ADMIN_COOKIE } from '../../../../../app/api/lite/_utils/backend'

const BACKEND_URL = 'https://backend.test'

const buildRequest = (body: unknown, token = 'token_123') => {
  const headers = new Headers({ 'content-type': 'application/json' })
  return {
    method: 'PATCH',
    headers,
    cookies: {
      get: (name: string) => (name === ADMIN_COOKIE && token ? { value: token } : undefined),
    },
    json: async () => body,
  } as unknown as NextRequest
}

const withParams = { params: { id: 'prod_1' } }

describe('inventory route', () => {
  const originalBackend = process.env.MEDUSA_BACKEND_URL
  let originalFetch: typeof fetch

  beforeEach(() => {
    process.env.MEDUSA_BACKEND_URL = BACKEND_URL
    originalFetch = global.fetch
  })

  afterEach(() => {
    process.env.MEDUSA_BACKEND_URL = originalBackend
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  const baseProduct = {
    id: 'prod_1',
    title: 'Linen Dress',
    handle: 'linen-dress',
    status: 'published',
    description: 'Lightweight summer dress',
    collection_id: 'col_1',
    collection: { id: 'col_1', title: 'Summer' },
    categories: [{ id: 'cat_1', name: 'Dresses' }],
    options: [{ id: 'opt_size', title: 'Size' }],
    images: [{ id: 'img_1', url: 'https://cdn.example.com/img_1.jpg' }],
    thumbnail: null,
    metadata: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  }

  it('marks all variants out of stock', async () => {
    const initialProduct = {
      ...baseProduct,
      variants: [
        {
          id: 'var_1',
          inventory_quantity: 5,
          manage_inventory: true,
          allow_backorder: true,
          prices: [{ id: 'price_1', amount: 1500, currency_code: 'bdt' }],
          options: [{ option_id: 'opt_size', value: 'M' }],
          sku: 'SKU-1',
        },
        {
          id: 'var_2',
          inventory_quantity: 2,
          manage_inventory: false,
          allow_backorder: false,
          prices: [{ id: 'price_2', amount: 1500, currency_code: 'bdt' }],
          options: [{ option_id: 'opt_size', value: 'L' }],
          sku: 'SKU-2',
        },
      ],
    }

    const updatedProduct = {
      ...initialProduct,
      variants: [
        { ...initialProduct.variants[0], inventory_quantity: 0, manage_inventory: true, allow_backorder: false },
        { ...initialProduct.variants[1], inventory_quantity: 0, manage_inventory: true, allow_backorder: false },
      ],
      thumbnail: 'https://cdn.example.com/img_1.jpg',
    }

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse({ product: initialProduct }))
      .mockResolvedValueOnce(jsonResponse({ variant: {} }))
      .mockResolvedValueOnce(jsonResponse({ variant: {} }))
      .mockResolvedValueOnce(jsonResponse({ product: updatedProduct }))

    global.fetch = fetchMock as unknown as typeof fetch

    const response = await PATCH(buildRequest({ in_stock: false }) as any, withParams as any)
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[1][0]).toBe(BACKEND_URL + '/admin/variants/var_1')
    expect(fetchMock.mock.calls[2][0]).toBe(BACKEND_URL + '/admin/variants/var_2')

    const firstPayload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string)
    expect(firstPayload).toEqual({
      manage_inventory: true,
      inventory_quantity: 0,
      allow_backorder: false,
    })

    expect(body.product.in_stock).toBe(false)
    expect(body.product.images).toEqual(['https://cdn.example.com/img_1.jpg'])
    expect(body.product.category_ids).toEqual(['cat_1'])
  })

  it('restocks specified variants with minimum quantity', async () => {
    const initialProduct = {
      ...baseProduct,
      variants: [
        {
          id: 'var_1',
          inventory_quantity: 0,
          manage_inventory: true,
          allow_backorder: false,
          prices: [{ id: 'price_1', amount: 2000, currency_code: 'bdt' }],
          options: [{ option_id: 'opt_size', value: 'S' }],
          sku: 'SKU-1',
        },
        {
          id: 'var_2',
          inventory_quantity: 4,
          manage_inventory: true,
          allow_backorder: true,
          prices: [{ id: 'price_2', amount: 2000, currency_code: 'bdt' }],
          options: [{ option_id: 'opt_size', value: 'M' }],
          sku: 'SKU-2',
        },
      ],
    }

    const updatedProduct = {
      ...initialProduct,
      variants: [
        { ...initialProduct.variants[0], inventory_quantity: 1, manage_inventory: true, allow_backorder: false },
        initialProduct.variants[1],
      ],
      thumbnail: 'https://cdn.example.com/img_1.jpg',
    }

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse({ product: initialProduct }))
      .mockResolvedValueOnce(jsonResponse({ variant: {} }))
      .mockResolvedValueOnce(jsonResponse({ product: updatedProduct }))

    global.fetch = fetchMock as unknown as typeof fetch

    const response = await PATCH(
      buildRequest({ in_stock: true, variantIds: ['var_1'] }) as any,
      withParams as any
    )

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const payload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string)
    expect(payload).toEqual({
      manage_inventory: true,
      inventory_quantity: 1,
      allow_backorder: false,
    })

    expect(body.product.in_stock).toBe(true)
    expect(body.product.price).toBe(2000)
    expect(body.product.currency_code).toBe('bdt')
    expect(body.product.variants[0].inventory_quantity).toBe(1)
    expect(body.product.variants[1].inventory_quantity).toBe(4)
  })
})

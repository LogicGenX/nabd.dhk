import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as createCollection } from '../../../../app/api/lite/catalog/collections/route'
import { POST as createCategory } from '../../../../app/api/lite/catalog/categories/route'
import { ADMIN_COOKIE } from '../../../../app/api/lite/_utils/backend'

const BACKEND_URL = 'https://backend.test'

const buildRequest = (path: string, body?: unknown, includeCookie = true) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (includeCookie) {
    headers.set('cookie', `${ADMIN_COOKIE}=token_123`)
  }
  return new NextRequest('http://localhost' + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  })
}

describe('catalog create routes', () => {
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

  it('creates a collection via lite endpoint', async () => {
    const payload = { collection: { id: 'col_1', title: 'Summer', handle: 'summer' } }
    const jsonResponse = new Response(JSON.stringify(payload), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })

    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(jsonResponse)
    global.fetch = fetchMock as unknown as typeof fetch

    const response = await createCollection(buildRequest('/api/lite/catalog/collections', { title: 'Summer' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toBe(BACKEND_URL + '/admin/lite/catalog/collections')
    const requestInit = fetchMock.mock.calls[0][1]
    expect(requestInit?.method).toBe('POST')
    expect(typeof requestInit?.body).toBe('string')

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data).toEqual(payload)
  })

  it('clears auth when collection request is unauthorized', async () => {
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
      new Response('Unauthorized', { status: 401 })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const response = await createCollection(buildRequest('/api/lite/catalog/collections', { title: 'Summer' }))
    expect(response.status).toBe(401)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie).toContain(`${ADMIN_COOKIE}=`)
  })

  it('falls back to admin collections when lite endpoint missing', async () => {
    const backendPayload = { product_collection: { id: 'col_2', title: 'Fallback', handle: 'fallback' } }
    const responses = [
      new Response('Not Found', { status: 404 }),
      new Response(JSON.stringify(backendPayload), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    ]

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockImplementation(() => Promise.resolve(responses.shift()!))
    global.fetch = fetchMock as unknown as typeof fetch

    const response = await createCollection(buildRequest('/api/lite/catalog/collections', { title: 'Fallback' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(BACKEND_URL + '/admin/lite/catalog/collections')
    expect(fetchMock.mock.calls[1][0]).toBe(BACKEND_URL + '/admin/collections')

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data).toEqual({ collection: backendPayload.product_collection })
  })

  it('creates a category via lite endpoint', async () => {
    const payload = { category: { id: 'cat_1', name: 'Dresses', handle: 'dresses' } }
    const jsonResponse = new Response(JSON.stringify(payload), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })

    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(jsonResponse)
    global.fetch = fetchMock as unknown as typeof fetch

    const response = await createCategory(buildRequest('/api/lite/catalog/categories', { name: 'Dresses' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toBe(BACKEND_URL + '/admin/lite/catalog/categories')
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data).toEqual(payload)
  })

  it('falls back to admin product categories when lite endpoint missing', async () => {
    const backendPayload = { product_category: { id: 'cat_2', name: 'Tops', handle: 'tops' } }
    const responses = [
      new Response('Not Found', { status: 404 }),
      new Response(JSON.stringify(backendPayload), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    ]

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockImplementation(() => Promise.resolve(responses.shift()!))
    global.fetch = fetchMock as unknown as typeof fetch

    const response = await createCategory(buildRequest('/api/lite/catalog/categories', { name: 'Tops' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(BACKEND_URL + '/admin/lite/catalog/categories')
    expect(fetchMock.mock.calls[1][0]).toBe(BACKEND_URL + '/admin/product-categories')

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data).toEqual({ category: backendPayload.product_category })
  })
})

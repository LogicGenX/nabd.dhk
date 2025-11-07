import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../../../../app/api/lite/catalog/route'
import { ADMIN_COOKIE } from '../../../../app/api/lite/_utils/backend'

const BACKEND_URL = 'https://backend.test'

const buildRequest = (token?: string) => {
  const headers = new Headers()
  if (token) headers.set('cookie', ADMIN_COOKIE + '=' + token)
  headers.set('accept-language', 'en-US')
  return new NextRequest('http://localhost/api/lite/catalog', {
    headers,
  })
}

describe('catalog route', () => {
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

  it('aggregates collections, categories, and unique sizes', async () => {
    const catalogPayload = {
      collections: [
        { id: 'col_1', title: 'Summer' },
        { id: 'col_2', title: 'Winter' },
      ],
      categories: [
        { id: 'cat_1', name: 'Dresses' },
        { id: 'cat_2', name: 'Outerwear' },
      ],
      sizes: ['M', 'XL'],
    }

    const jsonResponse = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse(catalogPayload))
      .mockResolvedValueOnce(jsonResponse({ products: [] }))

    global.fetch = fetchMock as unknown as typeof fetch

    const response = await GET(buildRequest('token_123'))
    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.collections).toEqual([
      { id: 'col_1', title: 'Summer' },
      { id: 'col_2', title: 'Winter' },
    ])
    expect(data.categories).toEqual([
      { id: 'cat_1', name: 'Dresses' },
      { id: 'cat_2', name: 'Outerwear' },
    ])
    expect(data.sizes).toEqual(['M', 'XL'])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstUrl = fetchMock.mock.calls[0][0] as string
    expect(firstUrl).toBe(BACKEND_URL + '/admin/lite/catalog')
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers
    expect(headers.get('accept-encoding')).toBe('identity')
    const secondUrl = fetchMock.mock.calls[1][0] as string
    expect(secondUrl).toBe(BACKEND_URL + '/admin/lite/products?limit=1000&expand=options,variants,variants.options')
  })

  it('treats missing product categories as optional', async () => {
    const catalogPayload = { collections: [], sizes: [] }

    const jsonResponse = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse(catalogPayload))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

    global.fetch = fetchMock as unknown as typeof fetch

    const response = await GET(buildRequest('token_123'))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.categories).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondUrl = fetchMock.mock.calls[1][0] as string
    expect(secondUrl).toBe(BACKEND_URL + '/admin/lite/products?limit=1000&expand=options,variants,variants.options')
  })

  it('clears cookie and returns 401 when upstream is unauthorized', async () => {
    const unauthorizedResponse = new Response('Unauthorized', { status: 401 })

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(unauthorizedResponse)

    global.fetch = fetchMock as unknown as typeof fetch

    const response = await GET(buildRequest('token_456'))
    expect(response.status).toBe(401)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie).toContain(ADMIN_COOKIE + '=')
    expect(setCookie.toLowerCase()).toContain('max-age=0')
  })
})

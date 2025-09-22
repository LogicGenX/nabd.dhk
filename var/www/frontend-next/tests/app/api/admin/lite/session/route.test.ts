import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { POST, GET, DELETE } from '../../../../../../app/api/admin/lite/session/route'
import { ADMIN_COOKIE } from '../../../../../../app/api/lite/_utils/backend'

const BACKEND_URL = 'https://backend.test'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('admin lite session route', () => {
  const originalBackend = process.env.MEDUSA_BACKEND_URL
  let originalFetch: typeof fetch

  beforeEach(() => {
    process.env.MEDUSA_BACKEND_URL = BACKEND_URL
    originalFetch = global.fetch
  })

  afterEach(() => {
    if (originalBackend === undefined) {
      delete process.env.MEDUSA_BACKEND_URL
    } else {
      process.env.MEDUSA_BACKEND_URL = originalBackend
    }
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('sets a non-secure cookie when authenticating over http', async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ token: 'tok_123', user: { id: 'admin' } }))

    global.fetch = fetchMock as unknown as typeof fetch

    const request = new NextRequest('http://localhost/api/admin/lite/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@nabd.dhk', password: 'secret' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie).toContain(ADMIN_COOKIE + '=')
    expect(setCookie.toLowerCase()).not.toContain('secure')
  })

  it('sets a secure cookie when authenticating over https', async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ token: 'tok_456', user: { id: 'admin' } }))

    global.fetch = fetchMock as unknown as typeof fetch

    const request = new NextRequest('https://admin.nabd.dhk/api/admin/lite/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@nabd.dhk', password: 'secret' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie).toContain(ADMIN_COOKIE + '=')
    expect(setCookie.toLowerCase()).toContain('secure')
  })

  it('clears a non-secure cookie when requests lack authentication over http', async () => {
    const request = new NextRequest('http://localhost/api/admin/lite/session')
    const response = await GET(request)
    expect(response.status).toBe(401)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie.toLowerCase()).toContain('max-age=0')
    expect(setCookie.toLowerCase()).not.toContain('secure')
  })

  it('clears a secure cookie for https requests', async () => {
    const request = new NextRequest('https://admin.nabd.dhk/api/admin/lite/session')
    const response = await GET(request)
    expect(response.status).toBe(401)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie.toLowerCase()).toContain('max-age=0')
    expect(setCookie.toLowerCase()).toContain('secure')
  })

  it('removes cookie on logout using the correct security flag', async () => {
    const request = new NextRequest('http://localhost/api/admin/lite/session', {
      method: 'DELETE',
    })
    const response = await DELETE(request)
    expect(response.status).toBe(200)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie.toLowerCase()).toContain('max-age=0')
    expect(setCookie.toLowerCase()).not.toContain('secure')
  })

  it('removes secure cookies on logout for https requests', async () => {
    const request = new NextRequest('https://admin.nabd.dhk/api/admin/lite/session', {
      method: 'DELETE',
    })
    const response = await DELETE(request)
    expect(response.status).toBe(200)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie.toLowerCase()).toContain('max-age=0')
    expect(setCookie.toLowerCase()).toContain('secure')
  })
})


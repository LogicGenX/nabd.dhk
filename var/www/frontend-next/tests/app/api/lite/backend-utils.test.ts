import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { buildAdminUrl } from '../../../../app/api/lite/_utils/backend'

const ORIGINAL_BACKEND = process.env.MEDUSA_BACKEND_URL
const ORIGINAL_NEXT_PUBLIC = process.env.NEXT_PUBLIC_MEDUSA_URL
const ORIGINAL_NODE_ENV = process.env.NODE_ENV

const setBackend = (value?: string) => {
  if (value === undefined) {
    delete process.env.MEDUSA_BACKEND_URL
  } else {
    process.env.MEDUSA_BACKEND_URL = value
  }
}

describe('buildAdminUrl', () => {
  beforeEach(() => {
    setBackend(undefined)
    delete process.env.NEXT_PUBLIC_MEDUSA_URL
  })

  afterEach(() => {
    if (ORIGINAL_BACKEND === undefined) {
      delete process.env.MEDUSA_BACKEND_URL
    } else {
      process.env.MEDUSA_BACKEND_URL = ORIGINAL_BACKEND
    }
    if (ORIGINAL_NEXT_PUBLIC === undefined) {
      delete process.env.NEXT_PUBLIC_MEDUSA_URL
    } else {
      process.env.NEXT_PUBLIC_MEDUSA_URL = ORIGINAL_NEXT_PUBLIC
    }
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
  })

  it('appends /admin when backend has no admin suffix', () => {
    setBackend('https://medusa.example')
    expect(buildAdminUrl('lite/products')).toBe('https://medusa.example/admin/lite/products')
  })

  it('avoids duplicating /admin when backend already ends with admin', () => {
    setBackend('https://medusa.example/admin')
    expect(buildAdminUrl('lite/products')).toBe('https://medusa.example/admin/lite/products')
  })

  it('supports backends that point directly at /admin/lite', () => {
    setBackend('https://medusa.example/admin/lite')
    expect(buildAdminUrl('lite/products')).toBe('https://medusa.example/admin/lite/products')
  })

  it('normalizes backends that point at the store API', () => {
    setBackend('https://medusa.example/store')
    expect(buildAdminUrl('lite/products')).toBe('https://medusa.example/admin/lite/products')
    setBackend('https://medusa.example/store/')
    expect(buildAdminUrl('lite/products')).toBe('https://medusa.example/admin/lite/products')
    setBackend('https://medusa.example/api/store')
    expect(buildAdminUrl('lite/products')).toBe('https://medusa.example/api/admin/lite/products')
  })

  it('normalizes paths that include an admin prefix', () => {
    setBackend('https://medusa.example')
    expect(buildAdminUrl('admin/auth')).toBe('https://medusa.example/admin/auth')
    expect(buildAdminUrl('/admin/auth')).toBe('https://medusa.example/admin/auth')
  })

  it('falls back to default production backend when env is missing', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    delete process.env.MEDUSA_BACKEND_URL
    delete process.env.NEXT_PUBLIC_MEDUSA_URL

    expect(buildAdminUrl('lite/products')).toBe(
      'https://medusa-backend-nabd.onrender.com/admin/lite/products'
    )

    process.env.NODE_ENV = originalEnv
  })

  it('auto-detects same-origin backend when env is missing', () => {
    delete process.env.MEDUSA_BACKEND_URL
    delete process.env.NEXT_PUBLIC_MEDUSA_URL

    const request = new NextRequest('https://frontend.nabd.dhk/api/admin/lite/session', {
      headers: {
        host: 'frontend.nabd.dhk',
        'x-forwarded-proto': 'https',
      },
    })

    expect(buildAdminUrl('lite/products', request)).toBe(
      'https://frontend.nabd.dhk/admin/lite/products'
    )
  })
})

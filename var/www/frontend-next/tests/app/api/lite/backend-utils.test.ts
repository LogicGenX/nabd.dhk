import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { buildAdminUrl } from '../../../../app/api/lite/_utils/backend'

const ORIGINAL_BACKEND = process.env.MEDUSA_BACKEND_URL

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
  })

  afterEach(() => {
    if (ORIGINAL_BACKEND === undefined) {
      delete process.env.MEDUSA_BACKEND_URL
    } else {
      process.env.MEDUSA_BACKEND_URL = ORIGINAL_BACKEND
    }
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

  it('normalizes paths that include an admin prefix', () => {
    setBackend('https://medusa.example')
    expect(buildAdminUrl('admin/auth')).toBe('https://medusa.example/admin/auth')
    expect(buildAdminUrl('/admin/auth')).toBe('https://medusa.example/admin/auth')
  })
})

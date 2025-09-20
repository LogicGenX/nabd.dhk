import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildQuery, redirectToLogin } from './admin-lite'

declare global {
  interface Window {
    location: {
      pathname: string
      search: string
      origin: string
      replace: (url: string) => void
    }
  }
}

describe('buildQuery', () => {
  it('stringifies defined params only', () => {
    const query = buildQuery({ limit: 20, offset: 0, q: '', payment_status: undefined, filter: 'ready' })
    expect(query).toBe('?limit=20&offset=0&filter=ready')
  })

  it('returns empty string when no params', () => {
    expect(buildQuery({})).toBe('')
  })
})

describe('redirectToLogin', () => {
  const originalWindow = globalThis.window

  beforeEach(() => {
    (globalThis as any).window = {
      location: {
        pathname: '/admin/lite/orders',
        search: '?limit=20',
        origin: 'https://dashboard.example',
        replace: vi.fn(),
      },
    }
  })

  afterEach(() => {
    (globalThis as any).window = originalWindow
    vi.restoreAllMocks()
  })

  it('navigates to login with next param', () => {
    redirectToLogin()
    const expected = 'https://dashboard.example/admin/login?next=%2Fadmin%2Flite%2Forders%3Flimit%3D20'
    expect((window.location.replace as any).mock.calls[0][0]).toBe(expected)
  })
})

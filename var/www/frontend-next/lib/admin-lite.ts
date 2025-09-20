export type LiteRequestInit = RequestInit & { json?: unknown }

const toQuery = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? '?' + query : ''
}

export const redirectToLogin = () => {
  if (typeof window === 'undefined') return
  const next = window.location.pathname + window.location.search
  const target = new URL('/admin/login', window.location.origin)
  target.searchParams.set('next', next)
  window.location.replace(target.toString())
}

export const liteFetch = async <T = any>(path: string, init: LiteRequestInit = {}) => {
  const headers = new Headers(init.headers || {})
  const options: RequestInit = {
    ...init,
    headers,
    cache: 'no-store',
    credentials: 'include',
  }

  if (init.json !== undefined) {
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    options.body = JSON.stringify(init.json)
    delete (options as any).json
  }

  const cleanedPath = path.replace(/^\/+/, '')
  const response = await fetch('/api/lite/' + cleanedPath, options)

  if (response.status === 401) {
    redirectToLogin()
    throw new Error('Not authenticated')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!response.ok) {
    let payload: any
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null)
    } else {
      payload = await response.text().catch(() => null)
    }
    const message = payload && typeof payload === 'object' && 'message' in payload ? payload.message : payload
    throw new Error(message || 'Admin Lite request failed')
  }

  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>
  }
  return response.text() as unknown as Promise<T>
}

export const buildQuery = toQuery

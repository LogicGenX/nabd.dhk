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

export const liteFetch = async <T = any>(path: string, init: LiteRequestInit = {}) => {
  const options: RequestInit = {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  }

  if (init.json !== undefined) {
    options.body = JSON.stringify(init.json)
  }

  const res = await fetch('/api/lite/' + path.replace(/^\/+/, ''), options)
  const contentType = res.headers.get('content-type') || ''
  if (!res.ok) {
    let payload: any = undefined
    if (contentType.includes('application/json')) {
      try {
        payload = await res.json()
      } catch (err) {
        payload = undefined
      }
    } else {
      payload = await res.text()
    }
    const message = payload && typeof payload === 'object' && 'message' in payload ? payload.message : payload
    throw new Error(message || 'Admin Lite request failed')
  }

  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return res.text() as unknown as Promise<T>
}

export const buildQuery = toQuery

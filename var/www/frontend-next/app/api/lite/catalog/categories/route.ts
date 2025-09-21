import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  buildAdminUrl,
  buildUpstreamHeaders,
  clearAuthCookie,
} from '../../_utils/backend'

export const runtime = 'nodejs'

const unauthorized = () => {
  const res = NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  clearAuthCookie(res)
  return res
}

const readJson = async (req: NextRequest) => {
  try {
    return await req.json()
  } catch (error) {
    throw NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 })
  }
}

const forward = async (req: NextRequest, token: string, path: string, body: any) => {
  const headers = buildUpstreamHeaders(req, token)
  headers.set('content-type', 'application/json')

  let response: Response
  try {
    response = await fetch(buildAdminUrl(path), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
      redirect: 'manual',
    })
  } catch (error) {
    console.error('[admin-lite] create category upstream failed', error)
    throw NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
  }

  if (response.status === 401) {
    throw unauthorized()
  }

  return response
}

export const POST = async (req: NextRequest) => {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  try {
    const payload = await readJson(req)
    const paths = ['lite/catalog/categories', 'product-categories']
    let lastResponse: Response | null = null
    for (const path of paths) {
      const upstream = await forward(req, token, path, payload)
      if (upstream.status === 404) {
        console.warn('[admin-lite] create category endpoint missing', path)
        lastResponse = upstream
        continue
      }
      const text = await upstream.text()
      if (!upstream.ok) {
        console.error('[admin-lite] create category upstream error', upstream.status, text)
        const message = (() => {
          try {
            const parsed = JSON.parse(text)
            return typeof parsed?.message === 'string' ? parsed.message : 'Backend request failed'
          } catch (error) {
            return 'Backend request failed'
          }
        })()
        throw NextResponse.json({ message }, { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 })
      }

      let data: any = {}
      if (text) {
        try {
          data = JSON.parse(text)
        } catch (error) {
          console.error('[admin-lite] create category parse error', error)
          throw NextResponse.json({ message: 'Invalid backend response' }, { status: 502 })
        }
      }

      return NextResponse.json(data, { status: upstream.status })
    }

    if (lastResponse) {
      return NextResponse.json({ message: 'Categories feature not available on backend' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Create category failed' }, { status: 502 })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('[admin-lite] create category handler failed', error)
    return NextResponse.json({ message: 'Create category failed' }, { status: 502 })
  }
}

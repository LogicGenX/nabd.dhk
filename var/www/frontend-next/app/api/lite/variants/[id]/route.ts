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

const forward = async (
  req: NextRequest,
  token: string,
  method: string,
  variantId: string,
  body?: any
) => {
  const headers = buildUpstreamHeaders(req, token)
  let requestBody: BodyInit | undefined
  if (body !== undefined) {
    headers.set('content-type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  const url = buildAdminUrl('admin/lite/variants/' + encodeURIComponent(variantId), req)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      cache: 'no-store',
      redirect: 'manual',
    })
  } catch (error) {
    console.error('[admin-lite] variants upstream failed', error)
    throw NextResponse.json({ message: 'Unable to reach backend' }, { status: 502 })
  }

  if (response.status === 401) {
    throw unauthorized()
  }

  return response
}

const parseJson = async (response: Response) => {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('[admin-lite] variants parse error', error)
    throw NextResponse.json({ message: 'Invalid backend response' }, { status: 502 })
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[admin-lite] variants upstream error', response.status, text)
    let message = 'Backend request failed'
    try {
      if (text) {
        const parsed = JSON.parse(text)
        if (typeof parsed?.message === 'string') {
          message = parsed.message
        }
      }
    } catch (error) {
      // ignore
    }
    throw NextResponse.json(
      { message },
      { status: response.status >= 400 && response.status < 500 ? response.status : 502 }
    )
  }

  if (response.status === 204) {
    return NextResponse.json({}, { status: 200 })
  }

  const data = await parseJson(response)
  return NextResponse.json(data, { status: response.status })
}

export const GET = async (req: NextRequest, { params }: { params: { id?: string } }) => {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  const variantId = params?.id
  if (!variantId) {
    return NextResponse.json({ message: 'Variant id is required' }, { status: 400 })
  }

  try {
    const response = await forward(req, token, 'GET', variantId)
    return await handleResponse(response)
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('[admin-lite] variant GET failed', error)
    return NextResponse.json({ message: 'Variant load failed' }, { status: 502 })
  }
}

export const PUT = async (req: NextRequest, { params }: { params: { id?: string } }) => {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  const variantId = params?.id
  if (!variantId) {
    return NextResponse.json({ message: 'Variant id is required' }, { status: 400 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 })
  }

  try {
    const response = await forward(req, token, 'PUT', variantId, body)
    return await handleResponse(response)
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('[admin-lite] variant PUT failed', error)
    return NextResponse.json({ message: 'Variant update failed' }, { status: 502 })
  }
}

export const PATCH = async (req: NextRequest, { params }: { params: { id?: string } }) => {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) {
    return unauthorized()
  }

  const variantId = params?.id
  if (!variantId) {
    return NextResponse.json({ message: 'Variant id is required' }, { status: 400 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 })
  }

  try {
    const response = await forward(req, token, 'PATCH', variantId, body)
    return await handleResponse(response)
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('[admin-lite] variant PATCH failed', error)
    return NextResponse.json({ message: 'Variant update failed' }, { status: 502 })
  }
}

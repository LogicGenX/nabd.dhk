import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const ADMIN_COOKIE = 'admin_lite_token'
const LOGIN_PATH = '/admin/login'
const ADMIN_PREFIX = '/admin/lite'

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const token = req.cookies.get(ADMIN_COOKIE)?.value

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!token) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = LOGIN_PATH
      loginUrl.search = ''
      const nextValue = pathname + (search || '')
      loginUrl.searchParams.set('next', nextValue)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname.startsWith(LOGIN_PATH) && token) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = ADMIN_PREFIX
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/lite/:path*', '/admin/login'],
}

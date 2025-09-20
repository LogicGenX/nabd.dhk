'use client'

import { useEffect, useState } from 'react'
import { redirectToLogin } from '../../lib/admin-lite'

type AdminUser = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

const fetchSession = async () => {
  const response = await fetch('/api/admin/lite/session', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  })

  if (response.status === 401) {
    redirectToLogin()
    throw new Error('Not authenticated')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = payload?.message || 'Failed to load session'
    throw new Error(message)
  }

  return response.json() as Promise<{ authenticated: boolean; user?: AdminUser | null }>
}

const logout = async () => {
  await fetch('/api/admin/lite/session', {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'include',
  })
  redirectToLogin()
}

export default function UserMenu() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetchSession()
      .then((payload) => {
        if (!mounted) return
        if (payload.authenticated) {
          setUser(payload.user || null)
        }
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || 'Failed to load session')
      })
    return () => {
      mounted = false
    }
  }, [])

  const name = user?.first_name || user?.last_name ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim() : undefined
  const label = name || user?.email || 'Signed in'

  return (
    <div className='flex items-center gap-3'>
      <span className='text-sm text-slate-600'>{error ? 'Session issue' : label}</span>
      <button
        type='button'
        onClick={logout}
        className='rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100'
      >
        Sign out
      </button>
    </div>
  )
}

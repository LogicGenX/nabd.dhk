'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const login = async (email: string, password: string) => {
  const response = await fetch('/api/admin/lite/session', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = payload?.message || 'Login failed'
    throw new Error(message)
  }

  return response.json().catch(() => ({}))
}

export default function AdminLoginPage() {
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') || '/admin/lite'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      router.replace(next)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-50 px-4'>
      <form
        onSubmit={onSubmit}
        className='w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg'
      >
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold text-slate-900'>Admin Lite</h1>
          <p className='text-sm text-slate-600'>Sign in with your Medusa admin credentials.</p>
        </div>
        <label className='block space-y-1 text-sm font-medium text-slate-700'>
          Email
          <input
            type='email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500'
          />
        </label>
        <label className='block space-y-1 text-sm font-medium text-slate-700'>
          Password
          <input
            type='password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500'
          />
        </label>
        {error && <p className='text-sm text-rose-600'>{error}</p>}
        <button
          type='submit'
          disabled={loading}
          className='w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500'
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

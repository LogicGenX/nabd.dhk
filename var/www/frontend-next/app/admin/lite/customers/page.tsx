'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { buildQuery, liteFetch } from '../../../../lib/admin-lite'

interface LiteCustomerSummary {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  name?: string | null
  phone?: string | null
  created_at: string
  updated_at: string
  orders_count: number
  last_order_at?: string | null
}

interface CustomersResponse {
  customers: LiteCustomerSummary[]
  count: number
  limit: number
  offset: number
}

export default function CustomersPage() {
  const [records, setRecords] = useState<LiteCustomerSummary[]>([])
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = useCallback(async (newOffset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const query = buildQuery({ limit, offset: newOffset, q: search || undefined })
      const data = await liteFetch<CustomersResponse>('customers' + query)
      setRecords(data.customers)
      setCount(data.count)
      setOffset(data.offset)
      setLimit(data.limit)
    } catch (err: any) {
      setError(err?.message || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [limit, search])

  useEffect(() => {
    loadCustomers(0)
  }, [loadCustomers])

  const pages = Math.ceil(count / limit) || 1
  const currentPage = Math.floor(offset / limit) + 1

  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit
    loadCustomers(newOffset)
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-900'>Customers</h2>
          <p className='text-sm text-slate-600'>Profile, contact details, and recent order history</p>
        </div>
        <button
          onClick={() => loadCustomers(offset)}
          className='rounded-full border border-slate-400 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100'
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <form
        className='flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row'
        onSubmit={(event) => {
          event.preventDefault()
          loadCustomers(0)
        }}
      >
        <label className='flex flex-1 flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Email or name'
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          />
        </label>
        <button
          type='submit'
          className='mt-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400 md:mt-0'
          disabled={loading}
        >
          Apply
        </button>
      </form>

      {error && <p className='rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700'>{error}</p>}

      <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
        <table className='min-w-full divide-y divide-slate-200 text-sm'>
          <thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'>
            <tr>
              <th className='px-4 py-3 text-left'>Customer</th>
              <th className='px-4 py-3 text-left'>Email</th>
              <th className='px-4 py-3 text-left'>Phone</th>
              <th className='px-4 py-3 text-left'>Orders</th>
              <th className='px-4 py-3 text-left'>Last order</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {records.map((customer) => (
              <tr key={customer.id} className='hover:bg-slate-50'>
                <td className='px-4 py-3'>
                  <Link href={'/admin/lite/customers/' + customer.id} className='font-medium text-slate-900 hover:underline'>
                    {customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unknown'}
                  </Link>
                </td>
                <td className='px-4 py-3 text-slate-700'>{customer.email}</td>
                <td className='px-4 py-3 text-slate-700'>{customer.phone || '—'}</td>
                <td className='px-4 py-3 text-slate-700'>{customer.orders_count}</td>
                <td className='px-4 py-3 text-slate-600'>
                  {customer.last_order_at ? new Date(customer.last_order_at).toLocaleString() : 'No orders yet'}
                </td>
              </tr>
            ))}
            {!records.length && !loading && (
              <tr>
                <td colSpan={5} className='px-4 py-8 text-center text-slate-500'>
                  No customers found with the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className='px-4 py-3 text-sm text-slate-500'>Loading customers…</p>}
      </div>

      <div className='flex items-center justify-between text-sm text-slate-600'>
        <span>Showing {records.length} of {count} customers</span>
        <div className='flex items-center gap-2'>
          <button
            className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400'
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
          >
            Previous
          </button>
          <span>Page {currentPage} of {pages}</span>
          <button
            className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400'
            onClick={() => goToPage(Math.min(pages, currentPage + 1))}
            disabled={currentPage >= pages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}

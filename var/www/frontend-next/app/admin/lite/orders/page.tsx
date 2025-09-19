'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildQuery, liteFetch } from '../../../../lib/admin-lite'
import { formatAmount } from '../../../../lib/currency'

interface LiteOrderSummary {
  id: string
  display_id?: string
  order_number?: string
  created_at: string
  currency_code: string
  customer: { name?: string | null; email?: string | null; phone?: string | null }
  totals: { subtotal: number; shipping_total: number; tax_total: number; discount_total: number; total: number }
  payment_status: string
  fulfillment_status: string
  items_count: number
}

interface OrdersResponse {
  orders: LiteOrderSummary[]
  count: number
  limit: number
  offset: number
}

const paymentStatuses = ['awaiting', 'captured', 'refunded', 'canceled']
const fulfillmentStatuses = ['not_fulfilled', 'partially_fulfilled', 'shipped', 'delivered', 'canceled']

export default function OrdersPage() {
  const [orders, setOrders] = useState<LiteOrderSummary[]>([])
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [fulfillmentStatus, setFulfillmentStatus] = useState('')

  const fetchOrders = useCallback(async (newOffset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const query = buildQuery({
        limit,
        offset: newOffset,
        q: search || undefined,
        payment_status: paymentStatus || undefined,
        fulfillment_status: fulfillmentStatus || undefined,
      })
      const data = await liteFetch<OrdersResponse>('orders' + query)
      setOrders(data.orders)
      setCount(data.count)
      setOffset(data.offset)
      setLimit(data.limit)
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [limit, search, paymentStatus, fulfillmentStatus])

  useEffect(() => {
    fetchOrders(0)
  }, [fetchOrders])

  const exportHref = useMemo(() => {
    const query = buildQuery({
      limit: Math.min(500, count || 500),
      q: search || undefined,
      payment_status: paymentStatus || undefined,
      fulfillment_status: fulfillmentStatus || undefined,
    })
    return '/api/lite/orders/export' + query
  }, [count, search, paymentStatus, fulfillmentStatus])

  const pages = Math.ceil(count / limit) || 1
  const currentPage = Math.floor(offset / limit) + 1

  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit
    fetchOrders(newOffset)
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-slate-900'>Orders</h2>
          <p className='text-sm text-slate-600'>Track payments, fulfillment, and customer context</p>
        </div>
        <div className='flex gap-3'>
          <a
            href={exportHref}
            className='rounded-full border border-slate-400 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100'
          >
            Export CSV
          </a>
          <button
            onClick={() => fetchOrders(offset)}
            className='rounded-full border border-slate-400 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100'
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <form
        className='grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4'
        onSubmit={(event) => {
          event.preventDefault()
          fetchOrders(0)
        }}
      >
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Order id or customer email'
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          />
        </label>
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Payment status
          <select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          >
            <option value=''>All</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className='flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500'>
          Fulfillment status
          <select
            value={fulfillmentStatus}
            onChange={(event) => setFulfillmentStatus(event.target.value)}
            className='mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm'
          >
            <option value=''>All</option>
            {fulfillmentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button
          type='submit'
          className='mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400'
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
              <th className='px-4 py-3 text-left'>Order</th>
              <th className='px-4 py-3 text-left'>Customer</th>
              <th className='px-4 py-3 text-left'>Items</th>
              <th className='px-4 py-3 text-left'>Total</th>
              <th className='px-4 py-3 text-left'>Payment</th>
              <th className='px-4 py-3 text-left'>Fulfillment</th>
              <th className='px-4 py-3 text-left'>Created</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {orders.map((order) => (
              <tr key={order.id} className='hover:bg-slate-50'>
                <td className='px-4 py-3'>
                  <div className='flex flex-col'>
                    <Link href={'/admin/lite/orders/' + order.id} className='font-medium text-slate-900 hover:underline'>
                      #{order.display_id || order.order_number || order.id}
                    </Link>
                    <span className='text-xs text-slate-500'>{order.id}</span>
                  </div>
                </td>
                <td className='px-4 py-3'>
                  <div className='flex flex-col gap-0.5'>
                    <span className='font-medium text-slate-900'>
                      {order.customer.name || order.customer.email || 'Unknown customer'}
                    </span>
                    {order.customer.email && <span className='text-xs text-slate-500'>{order.customer.email}</span>}
                  </div>
                </td>
                <td className='px-4 py-3 text-slate-700'>{order.items_count}</td>
                <td className='px-4 py-3 font-medium text-slate-900'>{formatAmount(order.totals.total / 100)}</td>
                <td className='px-4 py-3'>
                  <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700'>
                    {order.payment_status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className='px-4 py-3'>
                  <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700'>
                    {order.fulfillment_status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className='px-4 py-3 text-slate-600'>
                  {new Date(order.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {!orders.length && !loading && (
              <tr>
                <td colSpan={7} className='px-4 py-8 text-center text-slate-500'>
                  No orders found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className='px-4 py-3 text-sm text-slate-500'>Loading orders…</p>}
      </div>

      <div className='flex items-center justify-between text-sm text-slate-600'>
        <span>
          Showing {orders.length} of {count} orders
        </span>
        <div className='flex items-center gap-2'>
          <button
            className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400'
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {pages}
          </span>
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

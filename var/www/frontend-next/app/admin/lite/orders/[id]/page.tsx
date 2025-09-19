'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { buildQuery, liteFetch } from '../../../../../lib/admin-lite'
import { formatAmount } from '../../../../../lib/currency'

interface LiteOrderNote {
  id: string
  created_at: string
  author?: string
  note: string
}

interface LiteOrderDetail {
  id: string
  display_id?: string
  order_number?: string
  status?: string
  created_at: string
  updated_at: string
  currency_code: string
  customer: { id?: string | null; name?: string | null; email?: string | null; phone?: string | null }
  billing_address?: Record<string, string | null>
  shipping_address?: Record<string, string | null>
  totals: {
    subtotal: number
    shipping_total: number
    tax_total: number
    discount_total: number
    total: number
    paid_total: number
    refunded_total: number
  }
  payment_status: string
  fulfillment_status: string
  shipping_methods: any[]
  items: Array<{
    id: string
    title: string
    description?: string
    sku?: string | null
    variant_title?: string | null
    quantity: number
    unit_price: number
    subtotal: number
    total: number
    tax_total: number
    discount_total: number
    thumbnail?: string | null
  }>
  payments: Array<{
    id: string
    provider_id: string
    amount: number
    captured_amount: number
    refunded_amount: number
    currency_code?: string
    status?: string
    created_at?: string
    captured_at?: string | null
    canceled_at?: string | null
  }>
  fulfillments: Array<{
    id: string
    status: string
    shipped_at?: string | null
    canceled_at?: string | null
    tracking_links?: Array<{ id: string; url?: string | null; tracking_number?: string | null }>
  }>
  notes?: LiteOrderNote[]
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const [order, setOrder] = useState<LiteOrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const loadOrder = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError(null)
    try {
      const data = await liteFetch<{ order: LiteOrderDetail }>('orders/' + orderId)
      setOrder(data.order)
    } catch (err: any) {
      setError(err?.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const orderNumber = order?.display_id || order?.order_number || orderId

  const addressLines = (addr?: Record<string, string | null>) => {
    if (!addr) return []
    const parts: string[] = []
    const name = [addr.first_name, addr.last_name].filter(Boolean).join(' ')
    if (name) parts.push(name)
    if (addr.company) parts.push(String(addr.company))
    if (addr.address_1) parts.push(String(addr.address_1))
    if (addr.address_2) parts.push(String(addr.address_2))
    const cityLine = [addr.city, addr.postal_code].filter(Boolean).join(' ')
    if (cityLine) parts.push(cityLine)
    if (addr.country_code) parts.push(String(addr.country_code).toUpperCase())
    if (addr.phone) parts.push(String(addr.phone))
    return parts
  }

  const handlePaymentAction = async (action: 'capture' | 'refund' | 'mark_paid') => {
    if (!orderId) return
    setWorking(true)
    setMessage(null)
    setError(null)
    try {
      const data = await liteFetch<{ order: LiteOrderDetail }>('orders/' + orderId + '/payment', {
        method: 'PATCH',
        json: { action },
      })
      setOrder(data.order)
      setMessage('Payment updated successfully')
    } catch (err: any) {
      setError(err?.message || 'Failed to update payment')
    } finally {
      setWorking(false)
    }
  }

  const handleFulfillmentAction = async (action: 'mark_shipped' | 'mark_delivered' | 'cancel_fulfillment', payload?: { tracking_number?: string; tracking_carrier?: string }) => {
    if (!orderId) return
    setWorking(true)
    setMessage(null)
    setError(null)
    try {
      const data = await liteFetch<{ order: LiteOrderDetail }>('orders/' + orderId + '/fulfillment', {
        method: 'PATCH',
        json: { action, ...(payload || {}) },
      })
      setOrder(data.order)
      setMessage('Fulfillment updated successfully')
    } catch (err: any) {
      setError(err?.message || 'Failed to update fulfillment')
    } finally {
      setWorking(false)
    }
  }

  const markShippedWithPrompt = () => {
    const trackingNumber = typeof window !== 'undefined' ? window.prompt('Tracking number (optional)') : null
    const payload: { tracking_number?: string; tracking_carrier?: string } = {}
    if (trackingNumber && trackingNumber.trim()) {
      payload.tracking_number = trackingNumber.trim()
      const carrier = window.prompt('Carrier (optional)')
      if (carrier && carrier.trim()) {
        payload.tracking_carrier = carrier.trim()
      }
    }
    handleFulfillmentAction('mark_shipped', payload)
  }

  const handleAddNote = async () => {
    if (!orderId || !note.trim()) return
    setWorking(true)
    setMessage(null)
    setError(null)
    try {
      const data = await liteFetch<{ order: LiteOrderDetail }>('orders/' + orderId + '/note', {
        method: 'POST',
        json: { note },
      })
      setOrder(data.order)
      setNote('')
      setMessage('Note added')
    } catch (err: any) {
      setError(err?.message || 'Failed to add note')
    } finally {
      setWorking(false)
    }
  }

  const totals = order?.totals

  const csvLink = useMemo(() => {
    if (!orderId) return '#'
    const query = buildQuery({ limit: 1, q: orderId })
    return '/api/lite/orders/export' + query
  }, [orderId])

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          <button className='text-sm text-slate-500 hover:underline' onClick={() => router.back()}>
            ← Back
          </button>
          <h2 className='mt-2 text-2xl font-semibold text-slate-900'>Order #{orderNumber}</h2>
          {order && (
            <p className='text-sm text-slate-600'>Placed {new Date(order.created_at).toLocaleString()}</p>
          )}
        </div>
        <div className='flex gap-3'>
          <a
            href={csvLink}
            className='rounded-full border border-slate-400 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100'
          >
            Export CSV (single)
          </a>
        </div>
      </div>

      {message && <p className='rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>{message}</p>}
      {error && <p className='rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700'>{error}</p>}
      {loading && <p className='text-sm text-slate-500'>Loading order…</p>}

      {order && (
        <div className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='text-sm font-semibold text-slate-700'>Totals</h3>
              <dl className='mt-3 space-y-2 text-sm text-slate-600'>
                <div className='flex justify-between'>
                  <dt>Subtotal</dt>
                  <dd>{formatAmount((totals?.subtotal || 0) / 100)}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt>Shipping</dt>
                  <dd>{formatAmount((totals?.shipping_total || 0) / 100)}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt>Tax</dt>
                  <dd>{formatAmount((totals?.tax_total || 0) / 100)}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt>Discounts</dt>
                  <dd>{formatAmount((totals?.discount_total || 0) / 100)}</dd>
                </div>
                <div className='flex justify-between text-base font-semibold text-slate-900'>
                  <dt>Total</dt>
                  <dd>{formatAmount((totals?.total || 0) / 100)}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt>Paid</dt>
                  <dd>{formatAmount((totals?.paid_total || 0) / 100)}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt>Refunded</dt>
                  <dd>{formatAmount((totals?.refunded_total || 0) / 100)}</dd>
                </div>
              </dl>
            </div>
            <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='text-sm font-semibold text-slate-700'>Customer</h3>
              <p className='mt-2 text-sm text-slate-700'>{order.customer.name || order.customer.email || 'Unknown customer'}</p>
              <div className='mt-2 space-y-1 text-xs text-slate-500'>
                {order.customer.email && <div>{order.customer.email}</div>}
                {order.customer.phone && <div>{order.customer.phone}</div>}
              </div>
            </div>
            <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='text-sm font-semibold text-slate-700'>Payment & Fulfillment</h3>
              <p className='mt-2 text-sm capitalize text-slate-700'>Payment: {order.payment_status.replace(/_/g, ' ')}</p>
              <p className='text-sm capitalize text-slate-700'>Fulfillment: {order.fulfillment_status.replace(/_/g, ' ')}</p>
              <div className='mt-3 flex flex-wrap gap-2 text-xs'>
                <button
                  className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:opacity-50'
                  onClick={() => handlePaymentAction('capture')}
                  disabled={working}
                >
                  Capture
                </button>
                <button
                  className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:opacity-50'
                  onClick={() => handlePaymentAction('mark_paid')}
                  disabled={working}
                >
                  Mark as paid
                </button>
                <button
                  className='rounded-full border border-rose-200 px-3 py-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50'
                  onClick={() => handlePaymentAction('refund')}
                  disabled={working}
                >
                  Refund
                </button>
                <button
                  className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:opacity-50'
                  onClick={markShippedWithPrompt}
                  disabled={working}
                >
                  Mark shipped
                </button>
                <button
                  className='rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:opacity-50'
                  onClick={() => handleFulfillmentAction('mark_delivered')}
                  disabled={working}
                >
                  Mark delivered
                </button>
                <button
                  className='rounded-full border border-rose-200 px-3 py-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50'
                  onClick={() => handleFulfillmentAction('cancel_fulfillment')}
                  disabled={working}
                >
                  Cancel fulfillment
                </button>
              </div>
            </div>
          </div>

          <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <h3 className='text-sm font-semibold text-slate-700'>Line items</h3>
            <table className='mt-3 min-w-full divide-y divide-slate-100 text-sm'>
              <thead className='text-xs uppercase tracking-wide text-slate-500'>
                <tr>
                  <th className='px-3 py-2 text-left'>Item</th>
                  <th className='px-3 py-2 text-left'>Quantity</th>
                  <th className='px-3 py-2 text-left'>Unit price</th>
                  <th className='px-3 py-2 text-left'>Total</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className='px-3 py-2'>
                      <div className='flex flex-col'>
                        <span className='font-medium text-slate-800'>{item.title}</span>
                        {item.variant_title && <span className='text-xs text-slate-500'>{item.variant_title}</span>}
                        {item.sku && <span className='text-xs text-slate-500'>SKU: {item.sku}</span>}
                      </div>
                    </td>
                    <td className='px-3 py-2 text-slate-700'>{item.quantity}</td>
                    <td className='px-3 py-2 text-slate-700'>{formatAmount(item.unit_price / 100)}</td>
                    <td className='px-3 py-2 font-medium text-slate-800'>{formatAmount(item.total / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='text-sm font-semibold text-slate-700'>Shipping address</h3>
              <div className='mt-2 text-sm text-slate-600'>
                {addressLines(order.shipping_address).map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
            <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='text-sm font-semibold text-slate-700'>Billing address</h3>
              <div className='mt-2 text-sm text-slate-600'>
                {addressLines(order.billing_address).map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='text-sm font-semibold text-slate-700'>Payments</h3>
              <div className='mt-2 space-y-3'>
                {order.payments.map((payment) => (
                  <div key={payment.id} className='rounded-lg border border-slate-100 p-3 text-sm'>
                    <div className='flex justify-between text-slate-700'>
                      <span>{payment.provider_id}</span>
                      <span className='font-medium'>{formatAmount(payment.amount / 100)}</span>
                    </div>
                    <div className='mt-1 text-xs text-slate-500 capitalize'>Status: {payment.status || 'unknown'}</div>
                    <div className='mt-1 text-xs text-slate-500'>Captured: {formatAmount(payment.captured_amount / 100)}</div>
                    <div className='mt-1 text-xs text-slate-500'>Refunded: {formatAmount(payment.refunded_amount / 100)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <h3 className='text-sm font-semibold text-slate-700'>Fulfillment</h3>
              <div className='mt-2 space-y-3'>
                {order.fulfillments.map((fulfillment) => (
                  <div key={fulfillment.id} className='rounded-lg border border-slate-100 p-3 text-sm'>
                    <div className='flex justify-between text-slate-700'>
                      <span>Fulfillment {fulfillment.id}</span>
                      <span className='capitalize'>{fulfillment.status.replace(/_/g, ' ')}</span>
                    </div>
                    {fulfillment.tracking_links && fulfillment.tracking_links.length > 0 && (
                      <ul className='mt-2 space-y-1 text-xs text-slate-500'>
                        {fulfillment.tracking_links.map((link) => (
                          <li key={link.id}>
                            {link.tracking_number}
                            {link.url && (
                              <>
                                {' '}
                                <a href={link.url} className='text-slate-600 underline'>Track</a>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <h3 className='text-sm font-semibold text-slate-700'>Internal notes</h3>
            <div className='mt-3 space-y-3 text-sm text-slate-700'>
              {order.notes && order.notes.length > 0 ? (
                order.notes
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div key={entry.id} className='rounded-lg border border-slate-100 p-3'>
                      <div className='flex justify-between text-xs text-slate-500'>
                        <span>{entry.author || 'Staff'}</span>
                        <span>{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      <p className='mt-1 whitespace-pre-line'>{entry.note}</p>
                    </div>
                  ))
              ) : (
                <p className='text-sm text-slate-500'>No notes yet.</p>
              )}
            </div>
            <div className='mt-4 flex flex-col gap-2'>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder='Add internal note'
                className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
              />
              <button
                onClick={handleAddNote}
                className='self-end rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400'
                disabled={working || !note.trim()}
              >
                Add note
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

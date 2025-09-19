'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { liteFetch } from '../../../../../lib/admin-lite'
import { formatAmount } from '../../../../../lib/currency'

interface LiteCustomerDetail {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  name?: string | null
  phone?: string | null
  created_at: string
  updated_at: string
  note?: string | null
  addresses: Array<{
    id: string
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country_code?: string | null
    phone?: string | null
  }>
  recent_orders: Array<{
    id: string
    display_id?: string
    status?: string
    payment_status?: string
    fulfillment_status?: string
    created_at: string
    total: number
    currency_code: string
  }>
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const [customer, setCustomer] = useState<LiteCustomerDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', note: '' })

  const loadCustomer = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    setError(null)
    try {
      const data = await liteFetch<{ customer: LiteCustomerDetail }>('customers/' + customerId)
      setCustomer(data.customer)
      setForm({
        first_name: data.customer.first_name || '',
        last_name: data.customer.last_name || '',
        phone: data.customer.phone || '',
        note: data.customer.note || '',
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to load customer')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  const handleChange = (field: 'first_name' | 'last_name' | 'phone' | 'note', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleUpdate = async () => {
    if (!customerId) return
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const payload: Record<string, string> = {}
      if (form.first_name !== (customer?.first_name || '')) payload.first_name = form.first_name
      if (form.last_name !== (customer?.last_name || '')) payload.last_name = form.last_name
      if (form.phone !== (customer?.phone || '')) payload.phone = form.phone
      if (form.note !== (customer?.note || '')) payload.note = form.note
      if (Object.keys(payload).length === 0) {
        setMessage('No changes to save')
      } else {
        const data = await liteFetch<{ customer: LiteCustomerDetail }>('customers/' + customerId, {
          method: 'PATCH',
          json: payload,
        })
        setCustomer(data.customer)
        setForm({
          first_name: data.customer.first_name || '',
          last_name: data.customer.last_name || '',
          phone: data.customer.phone || '',
          note: data.customer.note || '',
        })
        setMessage('Profile updated')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update customer')
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          <button className='text-sm text-slate-500 hover:underline' onClick={() => router.back()}>
            ← Back
          </button>
          <h2 className='mt-2 text-2xl font-semibold text-slate-900'>Customer</h2>
          {customer && <p className='text-sm text-slate-600'>{customer.email}</p>}
        </div>
      </div>

      {message && <p className='rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700'>{message}</p>}
      {error && <p className='rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700'>{error}</p>}
      {loading && <p className='text-sm text-slate-500'>Loading customer…</p>}

      {customer && (
        <div className='space-y-6'>
          <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <h3 className='text-sm font-semibold text-slate-700'>Profile</h3>
            <div className='mt-3 grid gap-4 md:grid-cols-2'>
              <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                First name
                <input
                  value={form.first_name}
                  onChange={(event) => handleChange('first_name', event.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                />
              </label>
              <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                Last name
                <input
                  value={form.last_name}
                  onChange={(event) => handleChange('last_name', event.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                />
              </label>
              <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                Phone
                <input
                  value={form.phone}
                  onChange={(event) => handleChange('phone', event.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                />
              </label>
              <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                Internal note
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(event) => handleChange('note', event.target.value)}
                  className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
                />
              </label>
            </div>
            <button
              onClick={handleUpdate}
              className='mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400'
              disabled={working}
            >
              Save changes
            </button>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            {customer.addresses.map((address) => (
              <div key={address.id} className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
                <h3 className='text-sm font-semibold text-slate-700'>Address</h3>
                <div className='mt-2 text-sm text-slate-600'>
                  {[address.first_name, address.last_name].filter(Boolean).join(' ') || customer.name || customer.email}
                </div>
                <div className='mt-2 space-y-1 text-sm text-slate-600'>
                  {address.company && <div>{address.company}</div>}
                  {address.address_1 && <div>{address.address_1}</div>}
                  {address.address_2 && <div>{address.address_2}</div>}
                  <div>{[address.city, address.postal_code].filter(Boolean).join(' ')}</div>
                  {address.province && <div>{address.province}</div>}
                  {address.country_code && <div>{address.country_code.toUpperCase()}</div>}
                  {address.phone && <div>{address.phone}</div>}
                </div>
              </div>
            ))}
            {customer.addresses.length === 0 && (
              <div className='rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm'>
                No addresses on file.
              </div>
            )}
          </div>

          <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
            <h3 className='text-sm font-semibold text-slate-700'>Recent orders</h3>
            {customer.recent_orders.length > 0 ? (
              <table className='mt-3 min-w-full divide-y divide-slate-100 text-sm'>
                <thead className='text-xs uppercase tracking-wide text-slate-500'>
                  <tr>
                    <th className='px-3 py-2 text-left'>Order</th>
                    <th className='px-3 py-2 text-left'>Status</th>
                    <th className='px-3 py-2 text-left'>Payment</th>
                    <th className='px-3 py-2 text-left'>Fulfillment</th>
                    <th className='px-3 py-2 text-left'>Total</th>
                    <th className='px-3 py-2 text-left'>Created</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {customer.recent_orders.map((order) => (
                    <tr key={order.id}>
                      <td className='px-3 py-2'>
                        <Link href={'/admin/lite/orders/' + order.id} className='text-slate-800 hover:underline'>
                          #{order.display_id || order.id}
                        </Link>
                      </td>
                      <td className='px-3 py-2 capitalize text-slate-700'>{(order.status || '').replace(/_/g, ' ')}</td>
                      <td className='px-3 py-2 capitalize text-slate-700'>{(order.payment_status || '').replace(/_/g, ' ')}</td>
                      <td className='px-3 py-2 capitalize text-slate-700'>{(order.fulfillment_status || '').replace(/_/g, ' ')}</td>
                      <td className='px-3 py-2 font-medium text-slate-800'>{formatAmount(order.total / 100)}</td>
                      <td className='px-3 py-2 text-slate-600'>{new Date(order.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className='mt-2 text-sm text-slate-500'>No orders yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

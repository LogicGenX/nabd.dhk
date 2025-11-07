'use client'

import { ChangeEvent, FormEvent, useState } from 'react'
import Link from 'next/link'

import { useCart } from '../../lib/store'
import { formatAmount } from '../../lib/currency'

const steps = ['Cart', 'Shipping', 'Payment', 'Review']

const paymentOptions = [
  {
    value: 'cod',
    label: 'Cash on delivery',
    description: 'Pay in cash when your order arrives.',
  },
  {
    value: 'bkash',
    label: 'bKash',
    description: 'We’ll prompt you to confirm the payment in bKash.',
  },
]

type Status = 'idle' | 'submitting' | 'success' | 'error'

interface CheckoutResponse {
  result?: {
    type: string
    data?: Record<string, any>
  }
}

export default function CheckoutPage() {
  const { items, totalItems, totalPrice, clear } = useCart()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'BD',
    payment: paymentOptions[0].value,
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [serverError, setServerError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckoutResponse['result'] | null>(null)

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'Name is required'
    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!form.phone.trim()) nextErrors.phone = 'Phone is required'
    if (!form.address.trim()) nextErrors.address = 'Address is required'
    if (!form.city.trim()) nextErrors.city = 'City is required'
    if (!form.postalCode.trim()) nextErrors.postalCode = 'Postal code is required'
    if (!form.payment) nextErrors.payment = 'Select a payment method'
    if (items.length === 0) nextErrors.items = 'Your cart is empty'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setServerError(null)
    if (!validate()) return

    setStatus('submitting')
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country,
          notes: form.notes.trim(),
          paymentMethod: form.payment,
          items: items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.message || 'Checkout failed, please try again.')
      }

      const payload: CheckoutResponse = await response.json()
      setResult(payload.result || null)
      clear()
      setStatus('success')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to submit your order right now.')
      setStatus('error')
    }
  }

  const progressStep = status === 'success' ? 3 : 2
  const subtotalAmount = totalPrice()
  const formattedSubtotal = formatAmount(subtotalAmount)

  if (items.length === 0 && status !== 'success') {
    return (
      <main className="max-w-xl mx-auto p-6 text-center space-y-4">
        <CheckoutProgress current={0} />
        <h1 className="text-3xl font-bold tracking-brand">Checkout</h1>
        <p className="text-gray-600">Your cart is empty. Start shopping to place an order.</p>
        <Link href="/shop" className="inline-flex items-center justify-center rounded-full border border-black px-6 py-2 font-semibold hover:bg-black hover:text-white transition">
          Browse products
        </Link>
      </main>
    )
  }

  if (status === 'success') {
    return (
      <main className="max-w-2xl mx-auto p-6 space-y-6 text-center">
        <CheckoutProgress current={progressStep} />
        <h1 className="text-3xl font-bold tracking-brand">Thank you!</h1>
        <p className="text-gray-600">We&apos;ve received your order and will send a confirmation email shortly.</p>
        {result?.type === 'order' && (
          <div className="rounded-2xl border border-gray-200 p-4 text-left">
            <p className="font-semibold">Order #{result.data?.display_id ?? result.data?.id}</p>
            <p className="text-sm text-gray-600 mt-1">
              We&apos;ll reach out at <span className="font-medium">{form.email}</span> or{' '}
              <span className="font-medium">{form.phone}</span> if we need any additional details.
            </p>
          </div>
        )}
        <Link href="/shop" className="inline-flex items-center justify-center rounded-full border border-black px-6 py-2 font-semibold hover:bg-black hover:text-white transition">
          Continue shopping
        </Link>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
      <CheckoutProgress current={progressStep} />
      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Contact</h2>
              <p className="text-sm text-gray-500">Step 1 of 3</p>
            </div>
            <Field
              id="checkout-name"
              label="Full name"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
            />
            <Field
              id="checkout-email"
              type="email"
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
            />
            <Field
              id="checkout-phone"
              type="tel"
              label="Phone number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="+8801..."
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Shipping</h2>
              <p className="text-sm text-gray-500">Step 2 of 3</p>
            </div>
            <Field
              id="checkout-address"
              label="Street address"
              name="address"
              value={form.address}
              onChange={handleChange}
              error={errors.address}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="checkout-city"
                label="City"
                name="city"
                value={form.city}
                onChange={handleChange}
                error={errors.city}
              />
              <Field
                id="checkout-postal"
                label="Postal code"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                error={errors.postalCode}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Payment</h2>
              <p className="text-sm text-gray-500">Step 3 of 3</p>
            </div>
            <div className="space-y-3">
              {paymentOptions.map((option) => (
                <label
                  key={option.value}
                  className={`block rounded-2xl border p-4 cursor-pointer transition ${form.payment === option.value ? 'border-black bg-black/5' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="payment"
                    value={option.value}
                    checked={form.payment === option.value}
                    onChange={handleChange}
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize">{option.label}</p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${form.payment === option.value ? 'border-black bg-black text-white' : 'border-gray-300'}`}
                    >
                      {form.payment === option.value ? '✓' : ''}
                    </span>
                  </div>
                </label>
              ))}
              {errors.payment && <p className="text-sm text-red-600">{errors.payment}</p>}
            </div>
            <div>
              <label htmlFor="checkout-notes" className="block mb-1 text-sm font-medium text-gray-700">
                Delivery notes (optional)
              </label>
              <textarea
                id="checkout-notes"
                name="notes"
                rows={3}
                value={form.notes}
                onChange={handleChange}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </section>

          {serverError && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full rounded-full bg-black px-6 py-3 font-semibold tracking-wide text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {status === 'submitting' ? 'Placing order…' : 'Place order'}
          </button>
        </form>

        <aside className="rounded-3xl border border-gray-200 p-4 space-y-4 h-fit">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="space-y-3 divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.variantTitle && (
                    <p className="text-sm text-gray-500">{item.variantTitle}</p>
                  )}
                  <p className="text-sm text-gray-500">Qty {item.quantity}</p>
                </div>
                <span className="font-semibold">{formatAmount(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-2 text-sm text-gray-500">
            <span>Items</span>
            <span>{totalItems()} products</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span>{formattedSubtotal}</span>
          </div>
          <p className="text-xs text-gray-500">Shipping is calculated at fulfillment. Cash on delivery orders are confirmed over SMS.</p>
        </aside>
      </div>
    </main>
  )
}

function CheckoutProgress({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-center gap-2 text-xs uppercase tracking-wide text-gray-500">
      {steps.map((step, idx) => (
        <li key={step} className={`flex items-center gap-2 ${idx <= current ? 'text-black' : ''}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${idx <= current ? 'border-black bg-black text-white' : 'border-gray-300'}`}>
            {idx + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}

interface FieldProps {
  id: string
  label: string
  name: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  error?: string
  type?: string
  placeholder?: string
}

function Field({
  id,
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 ${error ? 'border-red-400' : 'border-gray-300'}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

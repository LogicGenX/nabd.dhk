'use client'

import { useState } from 'react'

const steps = ['Cart', 'Shipping', 'Payment', 'Review']

function CheckoutProgress({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-center mb-6 text-sm">
      {steps.map((step, idx) => (
        <li key={step} className="flex items-center">
          <span
            className={`px-2 ${idx === current ? 'font-bold' : 'text-gray-600'}`}
          >
            {step}
          </span>
          {idx < steps.length - 1 && (
            <span className="mx-1 text-gray-400">&rarr;</span>
          )}
        </li>
      ))}
    </ol>
  )
}

export default function CheckoutPage() {
  const [form, setForm] = useState({ name: '', address: '', payment: '' })
  const [errors, setErrors] = useState<{
    name?: string
    address?: string
    payment?: string
  }>({})

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!form.name) newErrors.name = 'Name is required'
    if (!form.address) newErrors.address = 'Address is required'
    if (!form.payment) newErrors.payment = 'Select a payment method'
    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      // handle order submission
    }
  }

  return (
    <main className="max-w-md mx-auto p-4 sm:p-8 space-y-6">
      <CheckoutProgress current={1} />
      <h1 className="text-3xl font-bold mb-4 tracking-brand">Checkout</h1>
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Customer info</h2>
          <div>
            <label htmlFor="checkout-name" className="block mb-1">
              Name
            </label>
            <input
              id="checkout-name"
              name="name"
              type="text"
              inputMode="text"
              value={form.name}
              onChange={handleChange}
              className={`w-full border p-3 rounded-md ${errors.name ? 'border-black' : 'border-gray-700'}`}
            />
            {errors.name && <p className="text-gray-700">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="checkout-address" className="block mb-1">
              Address
            </label>
            <input
              id="checkout-address"
              name="address"
              type="text"
              inputMode="text"
              value={form.address}
              onChange={handleChange}
              className={`w-full border p-3 rounded-md ${errors.address ? 'border-black' : 'border-gray-700'}`}
            />
            {errors.address && (
              <p className="text-gray-700">{errors.address}</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Shipping method</h2>
          <div className="p-3 border border-gray-700 rounded-md">
            Standard shipping - delivery timing to be confirmed
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Payment method</h2>
          <div>
            <label htmlFor="checkout-payment" className="block mb-1">
              Select method
            </label>
            <select
              id="checkout-payment"
              name="payment"
              value={form.payment}
              onChange={handleChange}
              className={`w-full border p-3 rounded-md ${errors.payment ? 'border-black' : 'border-gray-700'}`}
            >
              <option value="">Select</option>
              <option value="bkash">bKash</option>
              <option value="cod">Cash on Delivery</option>
            </select>
            {errors.payment && (
              <p className="text-gray-700">{errors.payment}</p>
            )}
          </div>
        </section>

        <button
          type="submit"
          className="w-full bg-accent text-white py-3 rounded-md hover:bg-accent/90"
        >
          Place order
        </button>
        <div className="flex justify-center space-x-4 text-xs text-gray-600">
          <span>🔒 Secure Checkout</span>
          <span>✔️ Money-back Guarantee</span>
        </div>
      </form>
    </main>
  )
}

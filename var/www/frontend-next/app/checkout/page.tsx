'use client';

import { useState } from 'react';

export default function CheckoutPage() {
  const [form, setForm] = useState({ name: '', address: '', payment: '' });
  const [errors, setErrors] = useState<{
    name?: string;
    address?: string;
    payment?: string;
  }>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!form.name) newErrors.name = 'Name is required';
    if (!form.address) newErrors.address = 'Address is required';
    if (!form.payment) newErrors.payment = 'Select a payment method';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // handle order submission
    }
  };

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold mb-4 tracking-brand">Checkout</h1>
      <form className="space-y-4 max-w-md" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="checkout-name" className="block mb-1">
            Name
          </label>
          <input
            id="checkout-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            className={`w-full border p-2 ${
              errors.name ? 'border-black' : 'border-gray-700'
            }`}
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
            value={form.address}
            onChange={handleChange}
            className={`w-full border p-2 ${
              errors.address ? 'border-black' : 'border-gray-700'
            }`}
          />
          {errors.address && <p className="text-gray-700">{errors.address}</p>}
        </div>
        <div>
          <label htmlFor="checkout-payment" className="block mb-1">
            Payment Method
          </label>
          <select
            id="checkout-payment"
            name="payment"
            value={form.payment}
            onChange={handleChange}
            className={`w-full border p-2 ${
              errors.payment ? 'border-black' : 'border-gray-700'
            }`}
          >
            <option value="">Select</option>
            <option value="bkash">bKash</option>
            <option value="cod">Cash on Delivery</option>
          </select>
          {errors.payment && <p className="text-gray-700">{errors.payment}</p>}
        </div>
        <button type="submit" className="w-full bg-black text-white py-2">
          Place order
        </button>
      </form>
    </main>
  );
}

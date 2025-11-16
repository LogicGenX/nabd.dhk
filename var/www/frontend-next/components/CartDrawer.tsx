'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FaTimes } from 'react-icons/fa'
import { useCart } from '../lib/store'
import { formatAmount } from '../lib/currency'
import CartEmptyState from './CartEmptyState'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: Props) {
  const cart = useCart((state) => state.cart)
  const totalPrice = useCart((state) => state.totalPrice)
  const updateQuantity = useCart((state) => state.updateQuantity)
  const [hydrated, setHydrated] = useState(false)

  const items = cart?.items || []
  const showEmpty = items.length === 0

  useEffect(() => {
    setHydrated(true)

    document.body.classList.toggle('overflow-hidden', open)
    return () => document.body.classList.remove('overflow-hidden')
  }, [open])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ${
          open ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 w-80 h-screen bg-white shadow-md p-4 space-y-4 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className='flex items-center justify-between p-2 border-b border-gray-200'>
          <h2 className='font-bold'>Cart.</h2>
          <button
            className='w-10 h-10 flex items-center justify-center rounded-full text-black hover:bg-accent hover:text-white'
            onClick={onClose}
            aria-label='Close cart'
          >
            <FaTimes />
          </button>
        </div>
        {hydrated && <CartEmptyState show={showEmpty} />}
        {hydrated && !showEmpty && (
          <>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Image
                      src={item.thumbnail || '/placeholder.svg'}
                      alt={item.title}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Qty {item.quantity}</span>
                        <div className="flex rounded border border-gray-200">
                          <button
                            className="px-2"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <button
                            className="px-2"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatAmount(
                      ((typeof item.total === 'number' ? item.total : item.unit_price * item.quantity) || 0) / 100,
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t pt-2">
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>{formatAmount(totalPrice())}</span>
              </div>
              <div className="space-y-2">
                <Link
                  href="/cart"
                  className="block w-full rounded-md border border-gray-200 px-4 py-2 text-center font-medium text-gray-700 hover:border-black hover:text-black"
                  onClick={onClose}
                >
                  View cart
                </Link>
                <Link
                  href="/checkout"
                  className="block w-full rounded-md bg-accent px-4 py-2 text-center font-semibold uppercase tracking-brand text-white shadow hover:bg-accent/90"
                  onClick={onClose}
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

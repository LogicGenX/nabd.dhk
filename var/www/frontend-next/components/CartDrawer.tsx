'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { FaTimes } from 'react-icons/fa'
import { useCart } from '../lib/store'
import CartEmptyState from './CartEmptyState'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: Props) {
  const { items, totalItems, totalPrice } = useCart()
  const [showEmpty, setShowEmpty] = useState(items.length === 0)

  useEffect(() => {
    setShowEmpty(items.length === 0)
  }, [items.length])

  return (
    <>
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          open ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 w-80 h-full bg-white shadow-md p-4 space-y-4 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          className='absolute top-4 right-4 p-1 rounded-md text-black hover:bg-accent hover:text-white'
          onClick={onClose}
          aria-label='Close cart'
        >
          <FaTimes />
        </button>
        <h2 className='font-bold'>Your Cart ({totalItems()} items)</h2>
        <CartEmptyState show={showEmpty} />
        {!showEmpty && (
          <>
            <ul className='space-y-2'>
              {items.map((item, i) => (
                <li key={i} className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2'>
                    <Image src={item.image} alt={item.title} width={40} height={40} className='rounded object-cover' />
                    <span>
                      {item.title} x {item.quantity}
                    </span>
                  </div>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className='flex justify-between font-semibold border-t pt-2'>
              <span>Subtotal</span>
              <span>${totalPrice().toFixed(2)}</span>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

'use client'
import Image from 'next/image'
import Link from 'next/link'
import { FaTrash } from 'react-icons/fa'
import { useCart } from '../../lib/store'

export default function CartPage() {
  const { items, updateQuantity, totalItems, totalPrice } = useCart()

  if (items.length === 0) {
    return (
      <main className='flex min-h-screen'>
        <div className='hidden md:block w-1/2 relative'>
          <Image src='/placeholder.svg' alt='Empty cart illustration' fill className='object-cover' />
        </div>
        <div className='flex w-full md:w-1/2 flex-col items-center justify-center text-center relative'>
          <h1 className='absolute top-4 left-4 font-archivo text-black/40'>
            CART<sup>{items.length}</sup>
          </h1>
          <p className='text-2xl font-archivo text-black/40 mb-6'>YOUR CART IS EMPTY</p>
          <Link href='/shop' className='px-4 py-2 bg-gray-200 text-gray-600 rounded-md border border-gray-300'>
            Continue Shopping
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className='max-w-screen-md mx-auto p-4 md:p-8 space-y-4'>
      <h1 className='text-2xl md:text-3xl font-bold mb-4 tracking-tight'>Cart</h1>
      <div className='overflow-x-auto'>
        <table className='w-full border-collapse'>
          <thead>
            <tr className='border-b border-gray-200 text-sm'>
              <th className='p-2 text-left'>Item</th>
              <th className='p-2'>Quantity</th>
              <th className='p-2'>Unit Price</th>
              <th className='p-2'>Total</th>
              <th className='p-2' />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className='border-b border-gray-200'>
                <td className='p-2'>
                  <div className='flex items-center gap-4'>
                    <Image
                      src={item.image || '/placeholder.svg'}
                      alt={item.title}
                      width={60}
                      height={60}
                      className='object-cover'
                    />
                    <span className='font-medium'>{item.title}</span>
                  </div>
                </td>
                <td className='p-2'>
                  <div className='flex items-center border border-gray-300 rounded w-max'>
                    <button
                      className='px-2'
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label='Decrease quantity'
                    >
                      -
                    </button>
                    <input
                      type='number'
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10)
                        if (isNaN(value) || value < 1) {
                          updateQuantity(item.id, 1)
                        } else {
                          updateQuantity(item.id, value)
                        }
                      }}
                      className='w-12 text-center border-l border-r border-gray-300'
                    />
                    <button
                      className='px-2'
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label='Increase quantity'
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className='p-2'>${item.price.toFixed(2)}</td>
                <td className='p-2 font-semibold'>
                  ${(item.price * item.quantity).toFixed(2)}
                </td>
                <td className='p-2 text-center'>
                  <button
                    onClick={() => updateQuantity(item.id, 0)}
                    aria-label='Remove item'
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='flex justify-between items-center font-semibold pt-4'>
        <span>Subtotal ({totalItems()} items)</span>
        <span className='text-xl'>${totalPrice().toFixed(2)}</span>
      </div>
      <div className='flex gap-4 pt-4'>
        <Link
          href='/shop'
          className='px-4 py-2 border border-gray-300 rounded-md text-gray-600'
        >
          Continue Shopping
        </Link>
        <Link
          href='/checkout'
          className='px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90'
        >
          Checkout
        </Link>
      </div>
    </main>
  )
}

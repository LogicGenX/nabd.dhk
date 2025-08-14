'use client'
import Image from 'next/image'
import Link from 'next/link'
import { FaTrash } from 'react-icons/fa'
import { useCart } from '../../lib/store'
import CartEmptyState from '../../components/CartEmptyState'

export default function CartPage() {
  const { items, updateQuantity, totalItems, totalPrice } = useCart()

  return (
    <main className='p-8 space-y-4'>
      <h1 className='text-3xl font-bold mb-4 tracking-brand'>Cart</h1>
      {items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <>
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
                {items.map((item, i) => (
                  <tr key={i} className='border-b border-gray-200'>
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
                      <div className='flex items-center border rounded w-max'>
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
                          onChange={e => updateQuantity(item.id, parseInt(e.target.value))}
                          className='w-12 text-center border-l border-r'
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
                      <button onClick={() => updateQuantity(item.id, 0)} aria-label='Remove item'>
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
            <Link href='/' className='px-4 py-2 border border-black rounded-md'>
              Continue Shopping
            </Link>
            <Link
              href='/checkout'
              className='px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90'
            >
              Checkout
            </Link>
          </div>
        </>
      )}
    </main>
  )
}

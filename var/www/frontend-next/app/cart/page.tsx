'use client'
import Image from 'next/image'
import Link from 'next/link'
import { FaTrash } from 'react-icons/fa'
import { useCart } from '../../lib/store'
import { formatAmount } from '../../lib/currency'

export default function CartPage() {
  const cart = useCart((state) => state.cart)
  const updateQuantity = useCart((state) => state.updateQuantity)
  const totalItems = useCart((state) => state.totalItems)
  const totalPrice = useCart((state) => state.totalPrice)

  const items = cart?.items || []

  const setQuantity = (id: string, quantity: number) => {
    updateQuantity(id, quantity < 1 ? 1 : quantity)
  }

  if (items.length === 0) {
    return (
      <main className='mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 py-12'>
        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10'>
          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>Cart</p>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'>Your cart is empty</h1>
          <p className='text-sm text-slate-600'>Add something you love and it will appear here.</p>
          <Link
            href='/shop'
            className='inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto'
          >
            Browse products
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className='mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-10'>
      <header className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>Cart</p>
          <h1 className='text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl'>Review your items</h1>
        </div>
        <p className='text-sm text-slate-600'>Subtotal {formatAmount(totalPrice())}</p>
      </header>

      <section className='space-y-4'>
        {items.map((item) => {
          const unitPrice = formatAmount((item.unit_price || 0) / 100)
          const lineTotal = formatAmount(
            ((typeof item.total === 'number' ? item.total : item.unit_price * item.quantity) || 0) / 100,
          )

          return (
            <article
              key={item.id}
              className='grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[140px_1fr]'
            >
              <div className='relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 sm:h-full'>
                <Image
                  src={item.thumbnail || '/placeholder.svg'}
                  alt={item.title}
                  fill
                  sizes='(min-width: 640px) 140px, 100vw'
                  className='object-cover'
                />
              </div>

              <div className='flex flex-col gap-4'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <p className='text-base font-semibold text-slate-900 sm:text-lg'>{item.title}</p>
                    {item.description && <p className='text-sm text-slate-600'>{item.description}</p>}
                    <p className='text-xs text-slate-500 break-all'>{item.id}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => updateQuantity(item.id, 0)}
                    className='inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-sm font-medium text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                    aria-label={`Remove ${item.title}`}
                  >
                    <FaTrash className='text-xs' />
                    Remove
                  </button>
                </div>

                <div className='flex flex-wrap items-center gap-4 sm:gap-6'>
                  <div className='inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2 shadow-inner'>
                    <button
                      type='button'
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity for ${item.title}`}
                      className='h-10 w-10 text-lg font-semibold text-slate-700 hover:text-slate-900'
                    >
                      -
                    </button>
                    <input
                      type='number'
                      min={1}
                      inputMode='numeric'
                      className='w-14 border-0 bg-transparent text-center text-base font-semibold outline-none'
                      value={item.quantity}
                      onChange={(event) => {
                        const next = parseInt(event.target.value || '1', 10)
                        setQuantity(item.id, Number.isFinite(next) ? next : 1)
                      }}
                      aria-label={`Quantity for ${item.title}`}
                    />
                    <button
                      type='button'
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase quantity for ${item.title}`}
                      className='h-10 w-10 text-lg font-semibold text-slate-700 hover:text-slate-900'
                    >
                      +
                    </button>
                  </div>

                  <div className='flex flex-1 flex-wrap items-center gap-4 text-sm text-slate-600 sm:justify-end'>
                    <div className='flex flex-col'>
                      <span className='text-xs uppercase tracking-wide text-slate-500'>Unit</span>
                      <span className='font-semibold text-slate-900'>{unitPrice}</span>
                    </div>
                    <div className='flex flex-col text-right sm:text-left'>
                      <span className='text-xs uppercase tracking-wide text-slate-500'>Total</span>
                      <span className='text-lg font-bold text-slate-900'>{lineTotal}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <section className='space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div className='flex items-center justify-between text-sm text-slate-600'>
          <span>Subtotal ({totalItems()} items)</span>
          <span className='text-xl font-bold text-slate-900'>{formatAmount(totalPrice())}</span>
        </div>
        <p className='text-xs text-slate-500'>
          Shipping and discounts are applied at checkout. We&apos;ll confirm your order details before you pay.
        </p>
        <div className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
          <Link
            href='/shop'
            className='inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto'
          >
            Continue shopping
          </Link>
          <Link
            href='/checkout'
            className='inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto'
          >
            Checkout
          </Link>
        </div>
      </section>
    </main>
  )
}

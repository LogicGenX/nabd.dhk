'use client'
import Image from 'next/image'
import Link from 'next/link'

export default function CartEmptyState() {
  return (
    <div className='flex flex-col items-center justify-center py-20 space-y-6 text-center'>
      <Image src='/logo.svg' alt='Empty cart' width={120} height={120} />
      <p className='text-xl font-semibold'>Your cart is empty</p>
      <Link href='/' className='px-4 py-2 border border-black rounded-md'>
        Continue Shopping
      </Link>
    </div>
  )
}

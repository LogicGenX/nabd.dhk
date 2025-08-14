'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Props = {
  show?: boolean
}

export default function CartEmptyState({ show = false }: Props) {
  const [render, setRender] = useState(show)

  useEffect(() => {
    if (show) {
      setRender(true)
    } else {
      const t = setTimeout(() => setRender(false), 200)
      return () => clearTimeout(t)
    }
  }, [show])

  return (
    <div
      className={`flex flex-col items-center justify-center py-20 space-y-6 text-center transition-all duration-200 transform ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${render ? '' : 'hidden'}`}
    >
      <Image src='/logo.svg' alt='Empty cart' width={120} height={120} />
      <p className='text-xl font-semibold'>Your cart is empty</p>
      <Link href='/' className='px-4 py-2 border border-black rounded-md'>
        Continue Shopping
      </Link>
    </div>
  )
}

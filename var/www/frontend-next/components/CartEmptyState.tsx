'use client'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

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
      className={`flex flex-col items-center justify-center pt-20 pb-8 space-y-6 text-center transition-all duration-200 transform ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${render ? '' : 'hidden'}`}
    >
      <p className='mt-6 text-xl font-semibold text-gray-500 uppercase'>Your cart is empty</p>
      <Link href='/shop' className='px-4 py-2 border border-gray-300 rounded-md text-gray-500'>
        Continue Shopping
      </Link>
    </div>
  )
}

'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FaBars, FaTimes, FaShoppingBag, FaUser } from 'react-icons/fa'
import { useCart } from '../lib/store'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const itemCount = useCart((state) => state.totalItems())

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center">
        <Image
          src="/logo.png"
          alt="nabd.dhk logo"
          width={1749}
          height={2481}
          className="h-8 w-auto"
          priority
        />
      </Link>

      <button className="md:hidden" onClick={() => setOpen(!open)}>
        {open ? <FaTimes /> : <FaBars />}
      </button>

      <div className={`flex-col md:flex-row md:flex gap-6 ${open ? 'flex' : 'hidden'} md:items-center`}>
        <Link href="/">Home</Link>
        <Link href="/shop">Shop</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/story">Our Story</Link>
        <Link href="/shop?category=MEN">MEN</Link>
        <Link href="/shop?category=WOMEN">WOMEN</Link>
        <Link href="/shop?category=UNISEX">UNISEX</Link>
      </div>

      <div className="hidden md:flex items-center gap-4">
        <Link href="/cart" className="relative">
          <FaShoppingBag />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full px-1">{itemCount}</span>
          )}
        </Link>
        <Link href="/login">
          <FaUser />
        </Link>
      </div>
    </nav>
  )
}

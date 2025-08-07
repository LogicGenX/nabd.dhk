'use client'
import { useState } from 'react'
import { FaBars, FaTimes, FaShoppingBag, FaUser } from 'react-icons/fa'
import { useCart } from '../lib/store'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const itemCount = useCart((state) => state.totalItems())

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <a href="/" className="flex items-center">
        <img src="/logo.png" alt="nabd.dhk logo" className="h-8 w-auto" />
      </a>

      <button className="md:hidden" onClick={() => setOpen(!open)}>
        {open ? <FaTimes /> : <FaBars />}
      </button>

      <div className={`flex-col md:flex-row md:flex gap-6 ${open ? 'flex' : 'hidden'} md:items-center`}>
        <a href="/">Home</a>
        <a href="/shop">Shop</a>
        <a href="/contact">Contact</a>
        <a href="/story">Our Story</a>
        <a href="/shop?category=MEN">MEN</a>
        <a href="/shop?category=WOMEN">WOMEN</a>
        <a href="/shop?category=UNISEX">UNISEX</a>
      </div>

      <div className="hidden md:flex items-center gap-4">
        <a href="/cart" className="relative">
          <FaShoppingBag />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full px-1">{itemCount}</span>
          )}
        </a>
        <a href="/login">
          <FaUser />
        </a>
      </div>
    </nav>
  )
}

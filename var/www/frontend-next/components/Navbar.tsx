"use client"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { FaBars, FaShoppingCart, FaSearch } from "react-icons/fa"
import { useCart } from "../lib/store"

const MobileMenu = dynamic(() => import("./MobileMenu"), { ssr: false })

export default function Navbar() {
  const cartQuantity = useCart((state) => state.totalItems())
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <nav className="grid grid-cols-3 items-center h-16 px-4">
        <div className="flex items-center gap-6">
          <button className="md:hidden hover:text-white hover:bg-black p-1 rounded" onClick={() => setMenuOpen(true)}>
            <FaBars />
          </button>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="hover:underline decoration-gray-300">Home</Link>
            <Link href="/shop" className="hover:underline decoration-gray-300">Shop</Link>
          </div>
        </div>
        <div className="justify-self-center">
          <Link href="/">
            <div className="relative h-12 w-28 overflow-hidden">
              <Image
                src="/logo.svg"
                alt="nabd.dhk logo"
                fill
                className="object-cover"
                priority
                sizes="7rem"
              />
            </div>
          </Link>
        </div>
        <div className="justify-self-end flex items-center gap-6">
          <Link href="/search" aria-label="Search" className="hover:text-white hover:bg-black p-1 rounded">
            <FaSearch />
          </Link>
          <Link href="/cart" aria-label="Cart" className="relative hover:text-white hover:bg-black p-1 rounded">
            <FaShoppingCart />
            {cartQuantity > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                {cartQuantity}
              </span>
            )}
          </Link>
        </div>
      </nav>
      {menuOpen && <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />}
    </header>
  )
}

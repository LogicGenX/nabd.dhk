'use client'
import Link from 'next/link'
import { FaTimes } from 'react-icons/fa'

interface Props {
  open: boolean
  onClose: () => void
}

export default function MobileMenu({ open, onClose }: Props) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          open ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 w-64 h-full bg-white shadow-md p-4 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className="absolute top-4 right-4 hover:text-white hover:bg-accent p-1 rounded-md"
          onClick={onClose}
          aria-label="Close menu"
        >
          <FaTimes />
        </button>
        <nav className="mt-8 flex flex-col space-y-4">
          <Link
            href="/"
            className="hover:underline decoration-gray-300"
            onClick={onClose}
          >
            Home
          </Link>
          <Link
            href="/shop"
            className="hover:underline decoration-gray-300"
            onClick={onClose}
          >
            Shop
          </Link>
        </nav>
      </aside>
    </>
  )
}

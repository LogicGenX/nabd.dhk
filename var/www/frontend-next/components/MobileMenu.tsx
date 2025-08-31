'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { medusa } from '../lib/medusa'

interface Props {
  open: boolean
  onClose: () => void
}

interface Collection {
  id: string
  title: string
}

interface Category {
  id: string
  name: string
}

export default function MobileMenu({ open, onClose }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [shopOpen, setShopOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    medusa.collections.list().then(({ collections }) => setCollections(collections))
    medusa.productCategories
      .list()
      .then(({ product_categories }) => setCategories(product_categories))
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
    return () => document.body.classList.remove('overflow-hidden')
  }, [open])

  // Trap focus inside the menu and support Escape to close
  useEffect(() => {
    if (!open) return
    const root = menuRef.current
    if (!root) return
    const selectors = 'a, button'
    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
      )
    const focusables = getFocusable()
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && focusables.length) {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black z-[1000] transition-opacity duration-300 ${
          open ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden='true'
      />
      <aside
        ref={menuRef}
        role='dialog'
        aria-modal='true'
        aria-label='Mobile menu'
        className={`fixed inset-0 sm:inset-y-0 sm:right-auto left-0 bg-white z-[1010] shadow-md p-4 transform transition-transform duration-300 w-screen sm:w-[85vw] sm:max-w-sm h-full ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className='absolute top-4 right-4 p-2 rounded-full w-10 h-10 flex items-center justify-center hover:text-white hover:bg-accent'
          onClick={onClose}
          aria-label='Close menu'
        >
          <FaTimes />
        </button>
        <nav className='mt-8 flex-1 overflow-y-auto flex flex-col space-y-4'>
          <Link
            href='/'
            className='py-2 hover:underline decoration-gray-300'
            onClick={onClose}
          >
            Home
          </Link>
          <div>
            <button
              className='flex items-center justify-between w-full py-2 hover:underline decoration-gray-300'
              onClick={() => setShopOpen((s) => !s)}
              aria-expanded={shopOpen}
              aria-controls='mobile-shop-section'
            >
              <span>Shop</span>
              {shopOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            <div
              id='mobile-shop-section'
              className={`${shopOpen ? 'block' : 'hidden'} mt-2 pl-4 flex flex-col space-y-4`}
            >
              <div>
                <h3 className='mb-1 font-semibold'>Collections</h3>
                <ul className='space-y-1'>
                  {collections.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/shop?collection=${c.id}`}
                        className='py-2 inline-block hover:underline'
                        onClick={onClose}
                      >
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className='mb-1 font-semibold'>Categories</h3>
                <ul className='space-y-1'>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/shop?category=${cat.id}`}
                        className='py-2 inline-block hover:underline'
                        onClick={onClose}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </nav>
      </aside>
    </>,
    document.body,
  )
}

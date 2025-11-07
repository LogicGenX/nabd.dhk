'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FaTimes } from 'react-icons/fa'
import { medusa } from '../../lib/medusa'
import ProductCard from '../ProductCard'
import { mapProductSummary, type ProductSummary } from '../../lib/products'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchOverlay({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  )
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Prevent background scroll on mobile when overlay is open
  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
    return () => document.body.classList.remove('overflow-hidden')
  }, [open])

  useEffect(() => {
    if (!open) return
    const focusable =
      overlayRef.current?.querySelectorAll<HTMLElement>('a, button, input')
    inputRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Tab' && focusable && focusable.length > 0) {
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!debounced) {
      setProducts([])
      setCategories([])
      return
    }
    let active = true
    const run = async () => {
      setLoading(true)
      try {
        const [prodRes, catRes] = await Promise.all([
          medusa.products.list({ q: debounced }),
          medusa.productCategories.list(),
        ])
        if (!active) return
        const mapped: ProductSummary[] = prodRes.products.map((p: any) => mapProductSummary(p))
        const filtered = catRes.product_categories.filter((c: any) =>
          c.name.toLowerCase().includes(debounced.toLowerCase()),
        )
        setProducts(mapped)
        setCategories(filtered)
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [debounced])

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Search overlay"
    >
      <div className={`w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${open ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'}`}>
        <div className="relative p-4 border-b">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, collections, categories"
            className="w-full border p-4 rounded-full pr-12 text-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            aria-label="Search products"
          />
          <span className="hidden md:inline absolute right-16 top-1/2 -translate-y-1/2 text-xs text-gray-500">Esc to close</span>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="absolute top-1/2 -translate-y-1/2 right-4 rtl:right-auto rtl:left-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {loading && <p>Searching...</p>}
          {!loading && categories.length > 0 && (
            <section className="mb-4">
              <h2 className="text-lg font-bold mb-2">Categories</h2>
              <ul className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/shop?category=${c.id}`}
                      onClick={onClose}
                      className="inline-block px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {!loading && !debounced && (
            <p className="text-gray-500">Try searching &apos;shirt&apos;, &apos;hoodie&apos; or &apos;accessory&apos;</p>
          )}
          {!loading &&
            debounced &&
            products.length === 0 &&
            categories.length === 0 && (
              <p>
                No results could be found. Please try again with a different
                query.
              </p>
            )}
        </div>
      </div>
    </div>
  )
}

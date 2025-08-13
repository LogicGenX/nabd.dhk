'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FaTimes } from 'react-icons/fa'
import { medusa } from '../../lib/medusa'
import ProductCard, { type Product } from '../ProductCard'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchOverlay({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const focusable = overlayRef.current?.querySelectorAll<HTMLElement>('a, button, input')
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
    if (!query) {
      setProducts([])
      setCategories([])
      return
    }
    let active = true
    const run = async () => {
      setLoading(true)
      try {
        const [prodRes, catRes] = await Promise.all([
          medusa.products.list({ q: query }),
          medusa.productCategories.list()
        ])
        if (!active) return
        const mapped: Product[] = prodRes.products.map((p: any) => {
          const thumb =
            (typeof p.thumbnail === 'string' && p.thumbnail) ||
            p.images?.[0]?.url ||
            '/placeholder.svg'
          return {
            id: p.id,
            title: p.title,
            thumbnail: thumb,
            price: p.variants[0]?.prices[0]?.amount / 100 || 0
          }
        })
        const filtered = catRes.product_categories.filter((c: any) =>
          c.name.toLowerCase().includes(query.toLowerCase())
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
  }, [query])

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 bg-white flex flex-col transform transition-all duration-300 ${open ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}
      role='dialog'
      aria-modal='true'
      aria-label='Search overlay'
    >
      <div className='relative p-4 border-b'>
        <input
          ref={inputRef}
          type='text'
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Search products...'
          className='w-full border p-2 rounded pr-10'
          aria-label='Search products'
        />
        <button
          onClick={onClose}
          aria-label='Close search'
          className='absolute top-4 right-4 rtl:left-4 rtl:right-auto p-2 rounded hover:bg-black hover:text-white'
        >
          <FaTimes />
        </button>
      </div>
      <div className='flex-1 overflow-y-auto p-4'>
        {loading && <p>Searching...</p>}
        {!loading && categories.length > 0 && (
          <section className='mb-4'>
            <h2 className='text-lg font-bold mb-2'>Categories</h2>
            <ul className='list-disc list-inside'>
              {categories.map(c => (
                <li key={c.id}>
                  <Link href={`/shop?category=${c.id}`} onClick={onClose} className='hover:underline'>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!loading && products.length > 0 && (
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        {!loading && query && products.length === 0 && categories.length === 0 && (
          <p>No results could be found. Please try again with a different query.</p>
        )}
      </div>
    </div>
  )
}


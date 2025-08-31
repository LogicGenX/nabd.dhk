'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { medusa } from '../lib/medusa'

interface Collection {
  id: string
  title: string
}

interface Category {
  id: string
  name: string
}

type Props = { onNavigate?: () => void }

export default function ShopDropdown({ onNavigate }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      medusa.collections.list().then(({ collections }) => collections),
      medusa.productCategories
        .list()
        .then(({ product_categories }) => product_categories),
    ])
      .then(([coll, cats]) => {
        if (!active) return
        setCollections(coll)
        setCategories(cats)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className='bg-white text-black rounded-xl shadow-2xl p-6 border border-black/5 grid grid-cols-2 gap-8 min-w-[32rem] md:min-w-[40rem] overflow-hidden'>
      <div>
        <p className='mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600'>Collections</p>
        <ul className='space-y-1 max-h-64 overflow-auto pr-2'>
          {loading && <li className='text-sm text-gray-500'>Loading...</li>}
          {!loading && collections.map((c) => (
            <li key={c.id}>
              <Link href={`/shop?collection=${c.id}`} className='block px-2 py-1 rounded hover:bg-gray-100' onClick={onNavigate}>
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className='mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600'>Categories</p>
        <ul className='space-y-1 max-h-64 overflow-auto pr-2'>
          {loading && <li className='text-sm text-gray-500'>Loading...</li>}
          {!loading && categories.map((cat) => (
            <li key={cat.id}>
              <Link href={`/shop?category=${cat.id}`} className='block px-2 py-1 rounded hover:bg-gray-100' onClick={onNavigate}>
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}


'use client'

import { useEffect, useState } from 'react'
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

export default function ShopDropdown() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    medusa.collections.list().then(({ collections }) => setCollections(collections))
    medusa.productCategories
      .list()
      .then(({ product_categories }) => setCategories(product_categories))
  }, [])

  return (
    <div className='bg-white rounded-md shadow-lg p-6 grid gap-6 md:grid-cols-2'>
      <div>
        <h3 className='mb-2 font-semibold'>Collections</h3>
        <ul className='space-y-1'>
          {collections.map((c) => (
            <li key={c.id}>
              <Link href={`/shop?collection=${c.id}`} className='hover:underline'>
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className='mb-2 font-semibold'>Categories</h3>
        <ul className='space-y-1'>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link href={`/shop?category=${cat.id}`} className='hover:underline'>
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}


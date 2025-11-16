'use client'

import { useEffect, useState } from 'react'
import { medusa } from '../lib/medusa'

interface Option {
  id: string
  name: string
  count: number
}

interface Props {
  selected?: string
  onSelect: (opt: Option | null) => void
  variant?: 'pills' | 'list'
  options?: Option[]
}

export default function CategoriesFilter({ selected, onSelect, variant = 'pills', options }: Props) {
  const [categories, setCategories] = useState<Option[]>(options || [])

  useEffect(() => {
    if (Array.isArray(options)) {
      setCategories(options)
      if (options.length) {
        return
      }
    }
    medusa.productCategories
      .list()
      .then(async ({ product_categories }) => {
        const withCount = await Promise.all(
          product_categories.map(async (c: any) => {
            const { count } = await medusa.products.list({
              category_id: [c.id],
              limit: 1,
            })
            return { id: c.id, name: c.name, count }
          })
        )
        setCategories(withCount)
      })
      .catch((error) => {
        console.warn('[CategoriesFilter] failed to load categories', error)
      })
  }, [options])

  const total = categories.reduce((sum, c) => sum + c.count, 0)

  if (variant === 'list') {
    return (
      <div>
        <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Categories</h4>
        <div className='space-y-2'>
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
              selected ? 'bg-white' : 'bg-black text-white border-black'
            }`}
          >
            <span>All</span>
            <span className='text-xs opacity-80'>{total}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(selected === c.id ? null : c)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
                selected === c.id ? 'bg-black text-white border-black' : 'bg-white'
              }`}
            >
              <span>{c.name}</span>
              <span className='text-xs opacity-80'>{c.count}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-wrap gap-2'>
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full border ${
          selected ? 'bg-white' : 'bg-black text-white'
        }`}
      >
        All ({total})
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(selected === c.id ? null : c)}
          className={`px-4 py-2 rounded-full border ${
            selected === c.id ? 'bg-black text-white' : 'bg-white'
          }`}
        >
          {c.name} ({c.count})
        </button>
      ))}
    </div>
  )
}

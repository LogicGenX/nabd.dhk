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
}

export default function CategoriesFilter({ selected, onSelect }: Props) {
  const [categories, setCategories] = useState<Option[]>([])

  useEffect(() => {
    medusa.productCategories.list().then(async ({ product_categories }) => {
      const withCount = await Promise.all(
        product_categories.map(async (c: any) => {
          const { count } = await medusa.products.list({
            category_id: c.id,
            limit: 1,
          })
          return { id: c.id, name: c.name, count }
        })
      )
      setCategories(withCount)
    })
  }, [])

  const total = categories.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className='flex flex-wrap gap-2'>
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1 rounded-full border ${
          selected ? 'bg-white' : 'bg-black text-white'
        }`}
      >
        All ({total})
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(selected === c.id ? null : c)}
          className={`px-3 py-1 rounded-full border ${
            selected === c.id ? 'bg-black text-white' : 'bg-white'
          }`}
        >
          {c.name} ({c.count})
        </button>
      ))}
    </div>
  )
}

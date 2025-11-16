'use client'

import { useEffect, useMemo, useState } from 'react'
import { medusa } from '../lib/medusa'

export type CategoryChip = {
  id: string
  name: string
  count?: number
}

interface Props {
  items?: CategoryChip[]
  names?: string[]
  selected?: string
  onSelect: (opt: CategoryChip | null) => void
}

const DEFAULT_NAMES = ['T-Shirts', 'Pants', 'Sets', 'Accessories']

export default function CategoryChips({ items, names = DEFAULT_NAMES, selected, onSelect }: Props) {
  const [fetched, setFetched] = useState<CategoryChip[]>([])

  useEffect(() => {
    if (items && items.length) {
      setFetched(items)
      return
    }
    let mounted = true
    medusa.productCategories
      .list()
      .then(({ product_categories }) => {
        if (!mounted) return
        setFetched(product_categories.map((c: any) => ({ id: c.id, name: c.name })) as CategoryChip[])
      })
      .catch((error) => {
        console.warn('[CategoryChips] failed to load categories', error)
      })
    return () => {
      mounted = false
    }
  }, [items])

  const chips = useMemo(() => {
    if (items && items.length) {
      return items
    }
    const byName = new Map(fetched.map((c) => [c.name.toLowerCase(), c]))
    return names
      .map((label) => byName.get(label.toLowerCase()))
      .filter(Boolean) as CategoryChip[]
  }, [items, fetched, names])

  return (
    <div className='flex flex-wrap gap-2'>
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full border ${
          selected ? 'bg-white' : 'bg-black text-white'
        }`}
      >
        All
      </button>
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(selected === c.id ? null : c)}
          className={`px-4 py-2 rounded-full border ${
            selected === c.id ? 'bg-black text-white' : 'bg-white'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}

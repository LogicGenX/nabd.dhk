'use client'

import { useEffect, useMemo, useState } from 'react'
import { medusa } from '../lib/medusa'

type Chip = {
  id: string
  name: string
}

interface Props {
  names?: string[]
  selected?: string
  onSelect: (opt: { id: string; name: string } | null) => void
}

export default function CategoryChips({
  names = ['T-Shirts', 'Pants', 'Sets', 'Accessories'],
  selected,
  onSelect,
}: Props) {
  const [all, setAll] = useState<Chip[]>([])

  useEffect(() => {
    medusa.productCategories.list().then(({ product_categories }) => {
      setAll(
        product_categories.map((c: any) => ({ id: c.id, name: c.name })) as Chip[],
      )
    })
  }, [])

  const chips = useMemo(() => {
    const byName = new Map(all.map((c) => [c.name.toLowerCase(), c]))
    return names
      .map((n) => byName.get(n.toLowerCase()))
      .filter(Boolean) as Chip[]
  }, [all, names])

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


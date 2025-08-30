'use client'

import { useEffect, useState } from 'react'
import { medusa } from '../lib/medusa'

interface Option {
  id: string
  title: string
  count: number
}

interface Props {
  selected?: string
  onSelect: (opt: Option | null) => void
}

export default function CollectionsFilter({ selected, onSelect }: Props) {
  const [collections, setCollections] = useState<Option[]>([])

  useEffect(() => {
    medusa.collections.list().then(async ({ collections }) => {
      const withCount = await Promise.all(
        collections.map(async (c: any) => {
          const { count } = await medusa.products.list({
            collection_id: c.id,
            limit: 1,
          })
          return { id: c.id, title: c.title, count }
        })
      )
      setCollections(withCount)
    })
  }, [])

  const total = collections.reduce((sum, c) => sum + c.count, 0)

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
      {collections.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(selected === c.id ? null : c)}
          className={`px-3 py-1 rounded-full border ${
            selected === c.id ? 'bg-black text-white' : 'bg-white'
          }`}
        >
          {c.title} ({c.count})
        </button>
      ))}
    </div>
  )
}

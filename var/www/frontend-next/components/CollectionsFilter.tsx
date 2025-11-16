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
  variant?: 'pills' | 'list'
  options?: Option[]
}

export default function CollectionsFilter({ selected, onSelect, variant = 'pills', options }: Props) {
  const [collections, setCollections] = useState<Option[]>(options || [])

  useEffect(() => {
    if (Array.isArray(options)) {
      setCollections(options)
      if (options.length) {
        return
      }
    }
    medusa.collections
      .list()
      .then(async ({ collections }) => {
        const withCount = await Promise.all(
          collections.map(async (c: any) => {
            const { count } = await medusa.products.list({
              collection_id: [c.id],
              limit: 1,
            })
            return { id: c.id, title: c.title, count }
          })
        )
        setCollections(withCount)
      })
      .catch((error) => {
        console.warn('[CollectionsFilter] failed to load collections', error)
      })
  }, [options])

  const total = collections.reduce((sum, c) => sum + c.count, 0)

  if (variant === 'list') {
    return (
      <div>
        <h4 className='text-sm uppercase tracking-wide text-gray-600 mb-2'>Collections</h4>
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
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(selected === c.id ? null : c)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
                selected === c.id ? 'bg-black text-white border-black' : 'bg-white'
              }`}
            >
              <span>{c.title}</span>
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
      {collections.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(selected === c.id ? null : c)}
          className={`px-4 py-2 rounded-full border ${
            selected === c.id ? 'bg-black text-white' : 'bg-white'
          }`}
        >
          {c.title} ({c.count})
        </button>
      ))}
    </div>
  )
}

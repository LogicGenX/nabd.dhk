'use client'
import { useEffect, useState } from 'react'
import { medusa } from '../lib/medusa'

interface Props {
  value: string
  onChange: (id: string) => void
}

export default function CollectionsDropdown({ value, onChange }: Props) {
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    medusa.collections.list().then(({ collections }) => setCollections(collections))
  }, [])

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className='border p-2 rounded-md'
    >
      <option value="">All Collections</option>
      {collections.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      ))}
    </select>
  )
}

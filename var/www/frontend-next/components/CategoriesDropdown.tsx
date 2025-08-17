'use client'
import { useEffect, useState } from 'react'
import { medusa } from '../lib/medusa'

interface Props {
  value: string
  onChange: (id: string) => void
}

export default function CategoriesDropdown({ value, onChange }: Props) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  )

  useEffect(() => {
    medusa.productCategories
      .list()
      .then(({ product_categories }) => setCategories(product_categories))
  }, [])

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border p-2 rounded-md"
    >
      <option value="">All Categories</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}

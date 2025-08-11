"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ProductGrid from "../../components/ProductGrid"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get("q") || ""
  const [query, setQuery] = useState(q)

  useEffect(() => {
    setQuery(q)
  }, [q])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4 tracking-wider">Search</h1>
      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="border p-2 rounded w-full"
        />
      </form>
      <ProductGrid q={q || undefined} />
    </main>
  )
}

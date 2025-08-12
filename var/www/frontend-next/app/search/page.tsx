"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { medusa } from "../../lib/medusa"
import ProductCard, { type Product } from "../../components/ProductCard"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get("q") || ""
  const [query, setQuery] = useState(q)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{
    id: string
    name: string
  }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setQuery(q)
  }, [q])

  useEffect(() => {
    const fetchResults = async () => {
      if (!q) {
        setProducts([])
        setCategories([])
        return
      }

      setLoading(true)
      try {
        const [prodRes, catRes] = await Promise.all([
          medusa.products.list({ q }),
          medusa.productCategories.list()
        ])

        const mapped: Product[] = prodRes.products.map((p: any) => {
          const thumb =
            (typeof p.thumbnail === "string" && p.thumbnail) ||
            p.images?.[0]?.url ||
            "/placeholder.svg"
          return {
            id: p.id,
            title: p.title,
            thumbnail: thumb,
            price: p.variants[0]?.prices[0]?.amount / 100 || 0
          }
        })

        const filteredCategories = catRes.product_categories.filter((c: any) =>
          c.name.toLowerCase().includes(q.toLowerCase())
        )

        setProducts(mapped)
        setCategories(filteredCategories)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
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

      {categories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-2">Categories</h2>
          <ul className="list-disc list-inside">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?category=${c.id}`} className="hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {!loading && q && products.length === 0 && categories.length === 0 && (
        <p>No results could be found. Please try again with a different query.</p>
      )}
    </main>
  )
}

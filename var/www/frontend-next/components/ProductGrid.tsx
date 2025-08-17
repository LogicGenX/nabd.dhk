import { medusa } from '../lib/medusa'
import ProductCard, { type Product } from './ProductCard'

interface ProductGridProps {
  collectionId?: string
  categoryId?: string
  q?: string
  order?: string
  limit?: number
  offset?: number
}

export default async function ProductGrid({
  collectionId,
  categoryId,
  q,
  order,
  limit,
  offset,
}: ProductGridProps) {
  const params: any = { limit, offset }
  if (collectionId) params.collection_id = collectionId
  if (categoryId) params.category_id = categoryId
  if (q) params.q = q
  if (order) params.order = order

  const { products } = await medusa.products.list(params)
  const mapped: Product[] = products.map((p: any) => {
    const thumb =
      (typeof p.thumbnail === 'string' && p.thumbnail) ||
      p.images?.[0]?.url ||
      '/placeholder.svg'
    return {
      id: p.id,
      title: p.title,
      thumbnail: thumb,
      price: p.variants[0]?.prices[0]?.amount / 100 || 0,
    }
  })

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
      {mapped.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}

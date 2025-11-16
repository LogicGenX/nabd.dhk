import ShopClient from './ShopClient'
import { getCategorySummaries, getCollectionSummaries } from '../../lib/catalog'

export default async function ShopPage() {
  const [collections, categories] = await Promise.all([getCollectionSummaries(), getCategorySummaries()])
  return <ShopClient initialCollections={collections} initialCategories={categories} />
}

import LookbookCarousel from '../components/LookbookCarousel'
import FeaturedProducts from '../components/FeaturedProducts'
import { sanity } from '../lib/sanity'

export default async function HomePage() {
  const siteSettings =
    (await sanity.fetch(
      `*[_type == "siteSettings"][0]{heroTagline}`
    )) || {}

  const heroTagline = siteSettings.heroTagline || ''

  return (
    <main>
      {heroTagline && (
        <section className="py-2xl text-center bg-gray-100">
          <h1 className="text-3xl font-bold tracking-wider">{heroTagline}</h1>
        </section>
      )}
      <LookbookCarousel />
      <section className="container mx-auto px-md">
        <h2 className="text-2xl font-bold mt-xl mb-md tracking-wider">Featured products</h2>
        <FeaturedProducts />
      </section>
    </main>
  )
}

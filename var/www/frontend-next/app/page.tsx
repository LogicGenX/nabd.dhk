import HomeHero from '../components/HomeHero'
import FeaturedProducts from '../components/FeaturedProducts'
import OurStory from '../components/OurStory'

export default function HomePage() {
  return (
    <main>
      <HomeHero />
      <section className="relative z-0 container mx-auto px-4">
        <h2 className="text-xl sm:text-2xl font-bold mt-4 mb-4 tracking-brand">
          Featured products
        </h2>
        <FeaturedProducts />
      </section>
      <OurStory />
    </main>
  )
}

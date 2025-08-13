import LookbookCarousel from '../components/LookbookCarousel';
import FeaturedProducts from '../components/FeaturedProducts';

export default function HomePage() {
  return (
    <main>
      <LookbookCarousel />
      <section className="relative z-0 container mx-auto px-4">
        <h2 className="text-2xl font-bold mt-4 mb-4 tracking-brand">
          Featured products
        </h2>
        <FeaturedProducts />
      </section>
    </main>
  );
}

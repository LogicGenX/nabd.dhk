import Image from 'next/image'
import Link from 'next/link'
import { sanity } from '../lib/sanity'

interface SiteSettings {
  heroTagline?: string
  heroCollectionId?: string
}

interface LookbookItem {
  url: string
  season?: string
  collection?: string
}

export default async function HomeHero() {
  const [settings, lookbook]: [SiteSettings, LookbookItem] = await Promise.all([
    sanity.fetch(`*[_type == "siteSettings"][0]{heroTagline, heroCollectionId}`),
    sanity.fetch(
      `*[_type == "lookbookItem"]|order(order asc)[0]{season, collection, "url": photo.asset->url}`,
    ),
  ])

  const collectionLink = settings?.heroCollectionId
    ? `/shop?collection=${settings.heroCollectionId}`
    : '/shop'

  const lookbookCollectionLink = lookbook?.collection
    ? `/shop?collection=${lookbook.collection}`
    : '/shop'

  return (
    <section className='relative w-full aspect-[4/5] md:h-screen md:aspect-auto overflow-hidden py-0'>
      <Image
        src={lookbook?.url || '/placeholder.svg'}
        alt={settings?.heroTagline || 'Hero image'}
        fill
        sizes='100vw'
        className='object-cover hero-zoom-inout'
        priority
      />
      <div className='absolute inset-0 pointer-events-none'>
        <div className='absolute inset-x-0 top-1/4 flex flex-col items-center justify-center text-white text-center gap-2'>
          <h1 className='text-3xl md:text-5xl font-bold tracking-brand'>NABD</h1>
          <Link
            href='/shop'
            className='pointer-events-auto text-2xl md:text-4xl font-bold tracking-brand underline-slide transition-transform hover:-translate-y-0.5'
          >
            SHOP ALL
          </Link>
        </div>
        {(lookbook?.season || settings?.heroTagline) && (
          <div className='absolute inset-0 flex items-end justify-center pb-6'>
            <Link
              href={lookbook?.season ? lookbookCollectionLink : collectionLink}
              className='pointer-events-auto text-lg md:text-2xl font-bold tracking-brand text-white underline-wipe-left'
            >
              {lookbook?.season ? `${lookbook.season} Lookbook` : settings?.heroTagline}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

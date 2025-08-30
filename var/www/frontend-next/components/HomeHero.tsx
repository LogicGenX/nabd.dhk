import Image from 'next/image'
import Link from 'next/link'
import { sanity } from '../lib/sanity'

interface SiteSettings {
  heroTagline?: string
  heroCollectionId?: string
}

interface LookbookItem {
  url: string
}

export default async function HomeHero() {
  const [settings, lookbook]: [SiteSettings, LookbookItem] = await Promise.all([
    sanity.fetch(`*[_type == "siteSettings"][0]{heroTagline, heroCollectionId}`),
    sanity.fetch(`*[_type == "lookbookItem"]|order(order asc)[0]{"url": photo.asset->url}`),
  ])

  const collectionLink = settings?.heroCollectionId
    ? `/shop?collection=${settings.heroCollectionId}`
    : '/shop'

  return (
    <section className='relative w-full aspect-[4/5] md:aspect-video overflow-hidden'>
      <Image
        src={lookbook?.url || '/placeholder.svg'}
        alt={settings?.heroTagline || 'Hero image'}
        fill
        sizes='100vw'
        className='object-cover'
        priority
      />
      <div className='absolute inset-0 flex flex-col items-center justify-center text-white text-center gap-2'>
        <h1 className='text-3xl md:text-5xl font-bold tracking-brand'>NABD</h1>
        <Link
          href='/shop'
          className='text-2xl md:text-4xl font-bold tracking-brand'
        >
          SHOP ALL
        </Link>
        {settings?.heroTagline && (
          <Link
            href={collectionLink}
            className='text-lg md:text-2xl font-bold tracking-brand'
          >
            {settings.heroTagline}
          </Link>
        )}
      </div>
    </section>
  )
}

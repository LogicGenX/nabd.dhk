'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import LookbookSkeleton from './LookbookSkeleton'

const Swiper = dynamic(
  () => import('swiper/react').then((m) => m.Swiper),
  { ssr: false, loading: () => <LookbookSkeleton /> }
)
const SwiperSlide = dynamic(
  () => import('swiper/react').then((m) => m.SwiperSlide),
  { ssr: false }
)

interface LookbookItem {
  title: string
  season: string
  url: string
}

export default function LookbookCarouselClient({ items }: { items: LookbookItem[] }) {
  const slides = items.length === 1 ? [...items, items[0]] : items
  const shouldLoop = slides.length > 1

  return (
    <Swiper
      loop={shouldLoop}
      watchOverflow
      className="w-full h-[60vh] md:h-[80vh]"
    >
      {slides.map((item, index) => (
        <SwiperSlide key={`${item.title}-${index}`}>
          <div className="relative w-full h-full hero-zoom">
            <Image
              src={item.url}
              alt={item.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
              <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-wider">
                {item.season} Lookbook
              </h2>
              <Link
                href="/shop"
                className="underline text-3xl md:text-5xl font-bold"
              >
                Shop now
              </Link>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}

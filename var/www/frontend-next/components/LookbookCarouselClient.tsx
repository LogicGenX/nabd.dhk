'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'

interface LookbookItem {
  title: string
  season: string
  url: string
  collection?: string
}

export default function LookbookCarouselClient({
  items,
}: {
  items: LookbookItem[]
}) {
  const shouldLoop = items.length > 1

  return (
    <section className="relative z-0 w-full min-h-[100dvh] md:min-h-screen md:aspect-video overflow-hidden py-0">
      <Swiper loop={shouldLoop} watchOverflow className="h-full w-full">
        {items.map((item, index) => (
          <SwiperSlide key={`${item.title}-${index}`} className="h-full">
            <div className="relative w-full h-full hero-zoom">
              <Image
                src={item.url}
                alt={item.title}
                fill
                sizes="100vw"
                className="object-cover"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent text-white flex items-end justify-center pb-6 px-4 pointer-events-none">
                <Link
                  href={item.collection ? `/shop?collection=${item.collection}` : '/shop'}
                  className="pointer-events-auto whitespace-nowrap text-lg sm:text-3xl md:text-4xl font-extrabold tracking-normal sm:tracking-brand uppercase font-archivo text-white underline-wipe-left text-shadow-hero"
                >
                  {item.season}
                </Link>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

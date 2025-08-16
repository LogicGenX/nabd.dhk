'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'

interface LookbookItem {
  title: string
  season: string
  url: string
}

export default function LookbookCarouselClient({ items }: { items: LookbookItem[] }) {
  const shouldLoop = items.length > 1

  return (
    <section className='relative z-10 w-full aspect-[4/5] md:aspect-video overflow-hidden'>
      <Swiper loop={shouldLoop} watchOverflow className='h-full w-full'>
        {items.map((item, index) => (
          <SwiperSlide key={`${item.title}-${index}`} className='h-full'>
            <div className='relative w-full h-full hero-zoom'>
              <Image
                src={item.url}
                alt={item.title}
                fill
                sizes='100vw'
                className='object-cover'
                priority={index === 0}
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex flex-col items-center justify-center text-white'>
                <h2 className='text-2xl md:text-4xl font-bold mb-4 tracking-brand'>
                  {item.season} Lookbook
                </h2>
                <Link
                  href='/shop'
                  className='underline-wipe-left text-3xl md:text-4xl font-bold tracking-brand'
                >
                  Shop Now
                </Link>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}


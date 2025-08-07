'use client'
import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { sanity } from '../lib/sanity'

interface LookbookItem {
  title: string
  season: string
  url: string
}

export default function LookbookCarousel() {
  const [items, setItems] = useState<LookbookItem[]>([])

  useEffect(() => {
    sanity
      .fetch(
        `*[_type == "lookbookItem"]|order(order asc){title,season,"url":photo.asset->url}`
      )
      .then(setItems)
  }, [])

  if (items.length === 0) {
    return (
      <div className="w-full h-[400px] md:h-[600px] bg-gray-200 flex items-center justify-center">Loading...</div>
    )
  }

  return (
    <Swiper loop className="w-full h-[400px] md:h-[600px]">
      {items.map((item) => (
        <SwiperSlide key={item.title}>
          <div className="relative w-full h-full">
            <img src={item.url} alt={item.title} className="object-cover w-full h-full aspect-[3/4]" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
              <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-wider">
                {item.season} Lookbook
              </h2>
              <a href="/shop" className="px-4 py-2 bg-white text-black font-semibold text-sm md:text-base">Shop now</a>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}

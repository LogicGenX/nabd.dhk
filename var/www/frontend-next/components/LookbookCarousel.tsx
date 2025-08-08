'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { sanity } from '../lib/sanity'
import LookbookSkeleton from './LookbookSkeleton'

interface LookbookItem {
  title: string
  season: string
  url: string
}

export default function LookbookCarousel() {
  const [items, setItems] = useState<LookbookItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sanity
      .fetch(
        `*[_type == "lookbookItem"]|order(order asc){title,season,"url":photo.asset->url}`
      )
      .then((res) => {
        setItems(res)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <LookbookSkeleton />
  }

  return (
    <Swiper loop className="w-full h-[400px] md:h-[600px]">
      {items.map((item, index) => (
        <SwiperSlide key={item.title}>
          <div className="relative w-full h-full">
            {item.url ? (
              <Image
                src={item.url}
                alt={item.title}
                fill
                sizes="100vw"
                className="object-cover aspect-[3/4]"
                priority={index === 0}
              />
            ) : (
              <div className="w-full h-full bg-gray-100" />
            )}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
              <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-wider">
                {item.season} Lookbook
              </h2>
              <Link href="/shop" className="px-4 py-2 bg-white text-black font-semibold text-sm md:text-base">Shop now</Link>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}

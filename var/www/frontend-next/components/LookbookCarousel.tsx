import LookbookCarouselClient from './LookbookCarouselClient'
import { sanity } from '../lib/sanity'

interface LookbookItem {
  title: string
  season: string
  url: string
}

export default async function LookbookCarousel() {
  const res: any[] = await sanity.fetch(
    `*[_type == "lookbookItem"]|order(order asc){title,season,"url":photo.asset->url}`
  )
  const items: LookbookItem[] = res.map((r: any) => ({
    title: r.title,
    season: r.season,
    url: r.url || '/placeholder.svg'
  }))

  return <LookbookCarouselClient items={items} />
}

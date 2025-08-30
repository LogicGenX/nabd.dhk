import Image from 'next/image'
import Link from 'next/link'

export default function OurStory() {
  return (
    <section className='bg-gray-50 py-16 px-4 md:py-24'>
      <div className='container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center'>
        <div>
          <Image
            src='/placeholder.svg'
            alt='Our brand story'
            width={600}
            height={400}
            className='w-full h-auto object-cover'
          />
        </div>
        <div>
          <h2 className='text-2xl font-bold mb-4 tracking-brand'>Our Story</h2>
          <p className='mb-6'>
            Born from a passion for mindful design, our brand blends modern
            aesthetics with ethical craftsmanship. Every piece reflects our
            commitment to sustainability and timeless style.
          </p>
          <Link
            href='/story'
            className='inline-block bg-black text-white px-8 py-3 tracking-wide'
          >
            Learn more
          </Link>
        </div>
      </div>
    </section>
  )
}

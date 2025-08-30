'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { medusa } from '../lib/medusa'

interface Props {
  open: boolean
  onClose: () => void
}

interface Collection {
  id: string
  title: string
}

interface Category {
  id: string
  name: string
}

export default function MobileMenu({ open, onClose }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [shopOpen, setShopOpen] = useState(false)

  useEffect(() => {
    medusa.collections.list().then(({ collections }) => setCollections(collections))
    medusa.productCategories
      .list()
      .then(({ product_categories }) => setCategories(product_categories))
  }, [])

  return (
    <>
      <div
        className={`fixed inset-0 bg-black z-[1000] transition-opacity duration-300 ${
          open ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 w-64 h-full bg-white z-[1010] shadow-md p-4 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className='absolute top-4 right-4 hover:text-white hover:bg-accent p-1 rounded-md'
          onClick={onClose}
          aria-label='Close menu'
        >
          <FaTimes />
        </button>
        <nav className='mt-8 flex flex-col space-y-4'>
          <Link
            href='/'
            className='hover:underline decoration-gray-300'
            onClick={onClose}
          >
            Home
          </Link>
          <div>
            <button
              className='flex items-center justify-between w-full hover:underline decoration-gray-300'
              onClick={() => setShopOpen((s) => !s)}
              aria-expanded={shopOpen}
              aria-controls='mobile-shop-section'
            >
              <span>Shop</span>
              {shopOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            <div
              id='mobile-shop-section'
              className={`${shopOpen ? 'block' : 'hidden'} mt-2 pl-4 flex flex-col space-y-4`}
            >
              <div>
                <h3 className='mb-1 font-semibold'>Collections</h3>
                <ul className='space-y-1'>
                  {collections.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/shop?collection=${c.id}`}
                        className='hover:underline'
                        onClick={onClose}
                      >
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className='mb-1 font-semibold'>Categories</h3>
                <ul className='space-y-1'>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/shop?category=${cat.id}`}
                        className='hover:underline'
                        onClick={onClose}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}

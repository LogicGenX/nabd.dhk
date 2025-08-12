'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { FaBars, FaShoppingCart, FaSearch } from 'react-icons/fa'
import { useCart } from '../lib/store'

const MobileMenu = dynamic(() => import('./MobileMenu'), { ssr: false })

const links = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' }
]

export default function Navbar() {
  const pathname = usePathname()
  const cartQuantity = useCart(state => state.totalItems())
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [bump, setBump] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (cartQuantity === 0) return
    setBump(true)
    const t = setTimeout(() => setBump(false), 300)
    return () => clearTimeout(t)
  }, [cartQuantity])

  return (
    <header className={`sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-white/20 transition-shadow ${scrolled ? 'shadow-md' : ''}`}>
      <nav className='grid grid-cols-3 items-center h-16 px-4'>
        <div className='flex items-center gap-6'>
          <button className='md:hidden p-1 rounded hover:bg-black hover:text-white' onClick={() => setMenuOpen(true)}>
            <FaBars />
          </button>
          <div className='hidden md:flex items-center gap-6'>
            {links.map(l => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className='group relative px-2 py-1'
                >
                  <span className={`transition-all ${active ? 'font-bold' : ''} group-hover:tracking-wider group-hover:-translate-y-0.5`}>{l.label}</span>
                  <span className='absolute inset-0 rounded-full bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity' />
                  <span
                    className={`absolute bottom-0 h-0.5 bg-black transition-all origin-center ${active ? 'w-full' : 'w-0 group-hover:w-full'} left-1/2 -translate-x-1/2 rtl:left-auto rtl:right-1/2 rtl:translate-x-1/2`}
                  />
                </Link>
              )
            })}
          </div>
        </div>
        <div className='justify-self-center'>
          <Link href='/'>
            <div className='relative h-12 w-28 overflow-hidden'>
              <Image
                src='/logo.svg'
                alt='nabd.dhk logo'
                fill
                className='object-cover'
                priority
                sizes='7rem'
              />
            </div>
          </Link>
        </div>
        <div className='justify-self-end flex items-center gap-6'>
          <Link href='/search' aria-label='Search' className='group relative p-1 rounded hover:bg-black hover:text-white'>
            <FaSearch className='group-hover:animate-micro-bounce' />
          </Link>
          <Link href='/cart' aria-label='Cart' className='group relative p-1 rounded hover:bg-black hover:text-white'>
            <FaShoppingCart className='group-hover:animate-micro-bounce' />
            {cartQuantity > 0 && (
              <span
                className={`absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white ${bump ? 'animate-bump' : ''}`}
              >
                {cartQuantity}
              </span>
            )}
          </Link>
        </div>
      </nav>
      {menuOpen && <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />}
    </header>
  )
}


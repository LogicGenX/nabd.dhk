'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { FaBars, FaShoppingCart, FaSearch } from 'react-icons/fa'
import { useCart } from '../lib/store'
import SearchOverlay from './SearchOverlay'
import CartDrawer from './CartDrawer'
import ShopDropdown from './ShopDropdown'

const MobileMenu = dynamic(() => import('./MobileMenu'), { ssr: false })

const links = [
  { href: '/', label: 'Home' },
]

export default function Navbar() {
  const pathname = usePathname()
  const cartQuantity = useCart((state) => state.totalItems())
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [bump, setBump] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) &&
        !searchOpen
      ) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  useEffect(() => {
    if (cartQuantity === 0) return
    setBump(true)
    const t = setTimeout(() => setBump(false), 300)
    return () => clearTimeout(t)
  }, [cartQuantity])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    setDropdownOpen(false)
  }, [pathname])

  return (
    <header
      className={`${pathname === '/' ? 'absolute top-0 w-full z-50 bg-transparent' : `sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-white/20 ${scrolled ? 'shadow-md' : ''}`} transition-shadow`}
    >
      <nav className={`grid grid-cols-3 items-center h-16 px-4 ${pathname === '/' ? 'text-white' : ''}`}>
        <div className="flex items-center gap-6">
          <button
            className={`md:hidden p-1 rounded-md ${pathname === '/' ? 'hover:bg-white/20 text-white' : 'hover:bg-accent hover:text-white'}`}
            onClick={() => setMenuOpen(true)}
          >
            <FaBars />
          </button>
          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className="group relative px-2 py-1"
                >
                  <span
                    className={`transition-all ${active ? 'font-bold' : ''} group-hover:tracking-brand group-hover:-translate-y-0.5`}
                  >
                    {l.label}
                  </span>
                  <span className="absolute inset-0 rounded-full bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span
                    className={`absolute bottom-0 h-0.5 bg-accent transition-all origin-center ${active ? 'w-full' : 'w-0 group-hover:w-full'} left-1/2 -translate-x-1/2 rtl:left-auto rtl:right-1/2 rtl:translate-x-1/2`}
                  />
                </Link>
              )
            })}
            <div
              ref={dropdownRef}
              className='relative pt-2'
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                aria-current={pathname.startsWith('/shop') ? 'page' : undefined}
                aria-expanded={dropdownOpen}
                className='group relative px-2 py-1 focus:outline-none'
              >
                <span
                  className={`transition-all ${pathname.startsWith('/shop') ? 'font-bold' : ''} group-hover:tracking-brand group-hover:-translate-y-0.5`}
                >
                  Shop
                </span>
                <span className='absolute inset-0 rounded-full bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity' />
                <span
                  className={`absolute bottom-0 h-0.5 bg-accent transition-all origin-center ${pathname.startsWith('/shop') ? 'w-full' : 'w-0 group-hover:w-full'} left-1/2 -translate-x-1/2 rtl:left-auto rtl:right-1/2 rtl:translate-x-1/2`}
                />
              </button>
              {dropdownOpen && (
                <div className='absolute left-0 top-full z-50'>
                  <ShopDropdown onNavigate={() => setDropdownOpen(false)} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="justify-self-center">
          <Link href="/">
            <div className="relative h-12 w-28 overflow-hidden">
              <Image
                src="/logo.svg"
                alt="nabd.dhk logo"
                fill
                className="object-cover"
                priority
                sizes="7rem"
              />
            </div>
          </Link>
        </div>
        <div className="justify-self-end flex items-center gap-6">
          <button
            aria-label="Search"
            className={`group relative p-1 rounded-md ${pathname === '/' ? 'hover:bg-white/20 text-white' : 'hover:bg-accent hover:text-white'}`}
            onClick={() => setSearchOpen(true)}
          >
            <FaSearch className="group-hover:animate-micro-bounce text-xl md:text-2xl" />
          </button>
          <button
            aria-label="Open cart"
            className={`group relative p-1 rounded-md ${pathname === '/' ? 'hover:bg-white/20 text-white' : 'hover:bg-accent hover:text-white'}`}
            onClick={() => setCartOpen((o) => !o)}
          >
            <FaShoppingCart className="group-hover:animate-micro-bounce text-xl md:text-2xl" />
            {cartQuantity > 0 && (
              <span
                className={`absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-xs text-white ${bump ? 'animate-bump' : ''}`}
              >
                {cartQuantity}
              </span>
            )}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      )}
      {searchOpen && (
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  )
}

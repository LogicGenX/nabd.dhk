"use client"
import Image from "next/image"
import Link from "next/link"
import { FaBars } from "react-icons/fa"

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 grid grid-cols-3 items-center h-16 px-4">
      <button className="justify-self-start">
        <FaBars />
      </button>
      <div className="justify-self-center">
        <Link href="/">
          <Image src="/logo.svg" alt="nabd.dhk logo" width={100} height={20} className="h-8 w-auto" priority />
        </Link>
      </div>
      <div className="justify-self-end flex items-center gap-6">
        <Link href="/shop">Shop</Link>
        <Link href="/search">Search</Link>
        <Link href="/">Home</Link>
      </div>
    </nav>
  )
}

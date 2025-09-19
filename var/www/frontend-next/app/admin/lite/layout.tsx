import Link from 'next/link'
import { ReactNode } from 'react'

export default function AdminLiteLayout({ children }: { children: ReactNode }) {
  const links = [
    { href: '/admin/lite/products', label: 'Products' },
    { href: '/admin/lite/orders', label: 'Orders' },
    { href: '/admin/lite/customers', label: 'Customers' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-slate-500">Admin Lite</span>
            <h1 className="text-xl font-semibold text-slate-900">nabd.dhk</h1>
          </div>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full px-3 py-1 hover:bg-slate-100">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}

'use client'
import { useCart } from '../lib/store'

export default function CartDrawer() {
  const { items } = useCart()

  return (
    <aside className="fixed right-0 top-0 w-80 h-full bg-white shadow-lg p-4">
      <h2 className="font-bold mb-4">Your Cart</h2>
      {items.length === 0 ? (
        <p>Shopping cart is empty!</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>{item.title}</span>
              <span>${item.price}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

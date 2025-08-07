'use client'
import { useCart } from '../lib/store'

export default function CartDrawer() {
  const { items, totalItems, totalPrice } = useCart()

  return (
    <aside className="fixed right-0 top-0 w-80 h-full bg-white shadow-lg p-4 space-y-4">
      <h2 className="font-bold">Your Cart ({totalItems()} items)</h2>
      {items.length === 0 ? (
        <p>Shopping cart is empty!</p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {item.title} x {item.quantity}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Subtotal</span>
            <span>${totalPrice().toFixed(2)}</span>
          </div>
        </>
      )}
    </aside>
  )
}

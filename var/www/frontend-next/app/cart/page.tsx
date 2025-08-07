'use client'
import { useCart } from '../../lib/store'

export default function CartPage() {
  const { items, clear } = useCart()

  return (
    <main className="p-xl space-y-md">
      <h1 className="text-3xl font-bold mb-md tracking-wider">Cart</h1>
      {items.length === 0 ? (
        <p>Shopping cart is empty!</p>
      ) : (
        <div className="space-y-xs">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between border-b pb-xs">
              <span>{item.title}</span>
              <span>${item.price}</span>
            </div>
          ))}
          <button className="mt-md px-md py-xs bg-brand-primary text-white" onClick={clear}>Clear cart</button>
        </div>
      )}
    </main>
  )
}

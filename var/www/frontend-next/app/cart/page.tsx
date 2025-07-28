'use client'
import { useCart } from '../../lib/store'

export default function CartPage() {
  const { items, clear } = useCart()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold mb-4 tracking-wider">Cart</h1>
      {items.length === 0 ? (
        <p>Shopping cart is empty!</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between border-b pb-2">
              <span>{item.title}</span>
              <span>${item.price}</span>
            </div>
          ))}
          <button className="mt-4 px-4 py-2 bg-black text-white" onClick={clear}>Clear cart</button>
        </div>
      )}
    </main>
  )
}

'use client'
import { useCart } from '../../lib/store'

export default function CartPage() {
  const { items, clear, updateQuantity, totalItems, totalPrice } = useCart()

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold mb-4 tracking-wider">Cart</h1>
      {items.length === 0 ? (
        <p>Shopping cart is empty!</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 items-center border-b pb-2">
              <span>{item.title}</span>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                className="w-16 border p-1"
              />
              <span>${item.price}</span>
              <span className="text-right">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold pt-2">
            <span>Subtotal ({totalItems()} items)</span>
            <span>${totalPrice().toFixed(2)}</span>
          </div>
          <button className="mt-4 px-4 py-2 bg-black text-white" onClick={clear}>
            Clear cart
          </button>
        </div>
      )}
    </main>
  )
}

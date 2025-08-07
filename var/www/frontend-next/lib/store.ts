import { create } from 'zustand'
import { persist } from 'zustand/middleware/persist'

interface CartItem {
  id: string
  title: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  add: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  clear: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              )
            }
          }
          return { items: [...state.items, item] }
        }),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, quantity } : i))
            .filter((i) => i.quantity > 0)
        })),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    }),
    { name: 'cart' }
  )
)

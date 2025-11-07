import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // variant id
  productId: string
  title: string
  variantTitle?: string | null
  price: number
  quantity: number
  image?: string
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
          if (!item.id || !item.productId) {
            return state
          }
          const existing = state.items.find((i) => i.id === item.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            }
          }
          return { items: [...state.items, item] }
        }),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, quantity } : i))
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'cart',
      version: 2,
      migrate: (persistedState: any, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return { items: [] }
        }
        if (!version || version < 2) {
          return { items: [] }
        }
        return persistedState as CartState
      },
    },
  ),
)

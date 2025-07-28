import { create } from 'zustand'

interface CartState {
  items: any[]
  add: (item: any) => void
  clear: () => void
}

export const useCart = create<CartState>((set) => ({
  items: [],
  add: (item) => set((state) => ({ items: [...state.items, item] })),
  clear: () => set({ items: [] })
}))

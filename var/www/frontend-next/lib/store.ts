import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { medusa } from './medusa'

type StoreCart = {
  id: string
  items?: Array<{
    id: string
    variant_id?: string | null
    title: string
    description?: string | null
    thumbnail?: string | null
    quantity: number
    unit_price: number
    subtotal?: number | null
    total?: number | null
    variant?: { id: string; title?: string | null } | null
    product_id?: string | null
  }>
  total?: number | null
  subtotal?: number | null
  region_id?: string | null
  currency_code?: string | null
}

interface CartState {
  cartId: string | null
  cart: StoreCart | null
  loading: boolean
  hydrate: () => Promise<void>
  add: (payload: { variantId: string; quantity?: number }) => Promise<void>
  updateQuantity: (lineId: string, quantity: number) => Promise<void>
  clear: () => Promise<void>
  totalItems: () => number
  totalPrice: () => number
}

const getBrowserSafeMedusa = () => {
  if (typeof window === 'undefined') {
    throw new Error('Cart operations are only available in the browser')
  }
  return medusa
}

const resolveDefaultRegionId = async () => {
  if (typeof window === 'undefined') return null
  const envRegion =
    process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ||
    process.env.MEDUSA_REGION_ID ||
    process.env.MEDUSA_REGION
  if (envRegion && envRegion.trim()) {
    return envRegion.trim()
  }
  const client = getBrowserSafeMedusa()
  const { regions } = await client.regions.list()
  return Array.isArray(regions) && regions.length ? regions[0].id : null
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => {
      const updateCartState = (cart: StoreCart | null) => {
        if (!cart) {
          set({ cart: null, cartId: null })
          return
        }
        set({ cart, cartId: cart.id })
      }

      const refreshCart = async (targetId?: string) => {
        if (typeof window === 'undefined') return null
        const id = targetId || get().cartId
        if (!id) return null
        try {
          const { cart } = await getBrowserSafeMedusa().carts.retrieve(id)
          updateCartState(cart)
          return cart
        } catch (error) {
          console.warn('[cart] failed to refresh cart', error)
          updateCartState(null)
          return null
        }
      }

      const ensureCart = async () => {
        if (typeof window === 'undefined') {
          throw new Error('Cart is unavailable during SSR')
        }
        const current = get().cart
        if (current && current.id) {
          return current
        }
        const client = getBrowserSafeMedusa()
        const regionId = await resolveDefaultRegionId()
        const { cart } = await client.carts.create(regionId ? { region_id: regionId } : {})
        updateCartState(cart)
        return cart
      }

      const actions = {
        hydrate: async () => {
          if (typeof window === 'undefined') return
          if (!get().cartId) return
          await refreshCart()
        },
        add: async ({ variantId, quantity = 1 }) => {
          if (!variantId) return
          try {
            set({ loading: true })
            const cart = await ensureCart()
            const client = getBrowserSafeMedusa()
            const { cart: updated } = await client.carts.lineItems.create(cart.id, {
              variant_id: variantId,
              quantity: Math.max(1, quantity),
            })
            updateCartState(updated)
          } catch (error) {
            console.error('[cart] failed to add item', error)
          } finally {
            set({ loading: false })
          }
        },
        updateQuantity: async (lineId: string, quantity: number) => {
          if (!lineId) return
          try {
            set({ loading: true })
            const cart = await ensureCart()
            const client = getBrowserSafeMedusa()
            if (quantity <= 0) {
              await client.carts.lineItems.delete(cart.id, lineId)
              await refreshCart(cart.id)
            } else {
              const { cart: updated } = await client.carts.lineItems.update(cart.id, lineId, {
                quantity: Math.max(1, quantity),
              })
              updateCartState(updated)
            }
          } catch (error) {
            console.error('[cart] failed to update quantity', error)
          } finally {
            set({ loading: false })
          }
        },
        clear: async () => {
          set({ cartId: null, cart: null })
        },
        totalItems: () => {
          const cart = get().cart
          if (!cart || !Array.isArray(cart.items)) return 0
          return cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        },
        totalPrice: () => {
          const cart = get().cart
          if (!cart) return 0
          const amount = typeof cart.total === 'number' ? cart.total : cart.subtotal || 0
          return amount / 100
        },
      }

      if (typeof window !== 'undefined') {
        actions.hydrate().catch((error) => console.warn('[cart] hydrate failed', error))
      }

      return {
        cartId: null,
        cart: null,
        loading: false,
        ...actions,
      }
    },
    {
      name: 'cart',
      version: 3,
      partialize: (state) => ({
        cartId: state.cartId,
        cart: state.cart,
      }),
      migrate: (persistedState: any, version) => {
        if (version < 3 || !persistedState || typeof persistedState !== 'object') {
          return { cartId: null, cart: null }
        }
        return persistedState
      },
    },
  ),
)

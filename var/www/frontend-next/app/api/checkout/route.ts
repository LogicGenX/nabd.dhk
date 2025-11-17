import { NextResponse } from 'next/server'

import { medusa } from '../../../lib/medusa'
import { splitName } from '../../../lib/products'
import { resolveRegionId, resolveShippingOptionId } from '../../../lib/server-cart'

export const runtime = 'nodejs'

type CheckoutItem = {
  id: string
  productId: string
  quantity: number
}

type CheckoutPayload = {
  items: CheckoutItem[]
  cartId?: string | null
  name: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  country?: string
  paymentMethod: 'cod' | 'bkash'
  notes?: string
}

const PAYMENT_PROVIDER_MAP: Record<CheckoutPayload['paymentMethod'], string> = {
  cod: 'manual',
  bkash: 'bkash',
}

const normalizePhone = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('0')) {
    return '+88' + digits
  }
  if (!digits.startsWith('88')) {
    return '+88' + digits
  }
  return '+' + digits
}

const normalizeCountryCode = (value?: string) => {
  if (!value) return 'bd'
  const trimmed = value.trim()
  if (!trimmed) return 'bd'
  return trimmed.slice(0, 2).toLowerCase()
}

const validatePayload = (payload: CheckoutPayload) => {
  const errors: string[] = []
  const requiresItems = !payload.cartId
  const safeItems =
    Array.isArray(payload.items) && payload.items.length
      ? payload.items.filter((item) => item?.id && item?.quantity > 0)
      : []
  if (requiresItems) {
    if (!payload?.items || !Array.isArray(payload.items) || !payload.items.length) {
      errors.push('Cart is empty')
    }
    if (!safeItems.length) {
      errors.push('No purchasable items found')
    }
  }
  if (!payload.name?.trim()) errors.push('Name is required')
  if (!payload.email?.trim()) errors.push('Email is required')
  if (!payload.phone?.trim()) errors.push('Phone is required')
  if (!payload.address?.trim()) errors.push('Address is required')
  if (!payload.city?.trim()) errors.push('City is required')
  if (!payload.postalCode?.trim()) errors.push('Postal code is required')
  if (!PAYMENT_PROVIDER_MAP[payload.paymentMethod]) errors.push('Unsupported payment method')

  return {
    ok: errors.length === 0,
    errors,
    items: safeItems,
  }
}

export const POST = async (req: Request) => {
  try {
    const payload: CheckoutPayload = await req.json()
    const validation = validatePayload(payload)
    if (!validation.ok) {
      return NextResponse.json({ message: validation.errors.join(', ') }, { status: 400 })
    }

    const providerId = PAYMENT_PROVIDER_MAP[payload.paymentMethod]

    let regionId = await resolveRegionId()
    let workingCartId: string

    if (payload.cartId) {
      const { cart } = await medusa.carts.retrieve(payload.cartId)
      if (!cart || !Array.isArray(cart.items) || !cart.items.length) {
        throw new Error('Cart has no items to checkout')
      }
      workingCartId = cart.id
      regionId = cart.region_id || regionId
    } else {
      const { cart: initialCart } = await medusa.carts.create({
        region_id: regionId,
      })

      for (const item of validation.items) {
        await medusa.carts.lineItems.create(initialCart.id, {
          variant_id: item.id,
          quantity: item.quantity,
        })
      }
      const refreshed = await medusa.carts.retrieve(initialCart.id)
      workingCartId = refreshed.cart.id
    }

    const { first_name, last_name } = splitName(payload.name)
    const normalizedPhone = normalizePhone(payload.phone)
    const address = {
      first_name,
      last_name: last_name || undefined,
      address_1: payload.address,
      city: payload.city,
      postal_code: payload.postalCode,
      country_code: normalizeCountryCode(payload.country),
      phone: normalizedPhone,
    }

    const { cart: addressedCart } = await medusa.carts.update(workingCartId, {
      email: payload.email.trim(),
      billing_address: address,
      shipping_address: address,
    })

    if (!addressedCart.id) {
      throw new Error('Unable to update cart with address information')
    }

    const shippingOptionId = await resolveShippingOptionId(addressedCart.id, regionId)

    await medusa.carts.addShippingMethod(addressedCart.id, {
      option_id: shippingOptionId,
      data: {},
    })

    await medusa.carts.createPaymentSessions(addressedCart.id)
    await medusa.carts.setPaymentSession(addressedCart.id, {
      provider_id: providerId,
    })

    const completion = await medusa.carts.complete(addressedCart.id)

    return NextResponse.json(
      {
        result: completion,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('[checkout] failed to place order', error)
    return NextResponse.json(
      {
        message: 'Unable to complete checkout at this time',
      },
      { status: 500 },
    )
  }
}

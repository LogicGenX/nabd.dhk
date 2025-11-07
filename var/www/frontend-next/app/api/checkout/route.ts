import { NextResponse } from 'next/server'

import { medusa } from '../../../lib/medusa'
import { splitName } from '../../../lib/products'

export const runtime = 'nodejs'

type CheckoutItem = {
  id: string
  productId: string
  quantity: number
}

type CheckoutPayload = {
  items: CheckoutItem[]
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

let cachedRegionId: string | null = null
let cachedShippingOptionId: string | null = null

const resolveRegionId = async () => {
  if (cachedRegionId) return cachedRegionId
  const envRegion =
    process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ||
    process.env.MEDUSA_REGION_ID ||
    process.env.MEDUSA_REGION ||
    null
  if (envRegion) {
    cachedRegionId = envRegion
    return envRegion
  }

  const { regions } = await medusa.regions.list()
  if (!regions?.length) {
    throw new Error('No Medusa regions available')
  }
  cachedRegionId = regions[0].id
  return cachedRegionId
}

const resolveShippingOptionId = async (regionId: string) => {
  if (cachedShippingOptionId) return cachedShippingOptionId
  const envOption =
    process.env.NEXT_PUBLIC_MEDUSA_SHIPPING_OPTION_ID ||
    process.env.MEDUSA_SHIPPING_OPTION_ID ||
    null
  if (envOption) {
    cachedShippingOptionId = envOption
    return envOption
  }

  const { shipping_options: options } = await medusa.shippingOptions.list({
    region_id: regionId,
  })
  const option = options?.find((opt: any) => !opt.is_return)
  if (!option) {
    throw new Error('No shipping options configured for region ' + regionId)
  }
  cachedShippingOptionId = option.id
  return cachedShippingOptionId
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
  if (!payload?.items || !Array.isArray(payload.items) || !payload.items.length) {
    errors.push('Cart is empty')
  }
  const safeItems =
    Array.isArray(payload.items) && payload.items.length
      ? payload.items.filter((item) => item?.id && item?.quantity > 0)
      : []
  if (!safeItems.length) {
    errors.push('No purchasable items found')
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

    const regionId = await resolveRegionId()
    const shippingOptionId = await resolveShippingOptionId(regionId)
    const providerId = PAYMENT_PROVIDER_MAP[payload.paymentMethod]

    const {
      cart: initialCart,
    } = await medusa.carts.create({
      region_id: regionId,
    })

    for (const item of validation.items) {
      await medusa.carts.lineItems.create(initialCart.id, {
        variant_id: item.id,
        quantity: item.quantity,
      })
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

    const { cart: addressedCart } = await medusa.carts.update(initialCart.id, {
      email: payload.email.trim(),
      billing_address: address,
      shipping_address: address,
    })

    if (!addressedCart.id) {
      throw new Error('Unable to update cart with address information')
    }

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

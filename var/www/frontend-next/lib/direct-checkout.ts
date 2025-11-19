import { medusa } from './medusa'
import { splitName } from './products'

type CheckoutItem = {
  id: string
  quantity: number
}

export type DirectCheckoutPayload = {
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
}

const PAYMENT_PROVIDER_MAP: Record<DirectCheckoutPayload['paymentMethod'], string> = {
  cod: 'manual',
  bkash: 'bkash',
}

const cleanEnv = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  return trimmed
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

let cachedRegionId: string | null = null
let cachedShippingOptionId: string | null = null

const resolveRegionId = async (): Promise<string> => {
  if (cachedRegionId) {
    return cachedRegionId
  }
  const envRegion =
    cleanEnv(process.env.NEXT_PUBLIC_MEDUSA_REGION_ID) ||
    cleanEnv(process.env.MEDUSA_REGION_ID) ||
    cleanEnv(process.env.MEDUSA_REGION)
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

const resolveConfiguredShippingOptionId = () => {
  if (cachedShippingOptionId) return cachedShippingOptionId
  const envOption =
    cleanEnv(process.env.NEXT_PUBLIC_MEDUSA_SHIPPING_OPTION_ID) ||
    cleanEnv(process.env.MEDUSA_SHIPPING_OPTION_ID) ||
    null
  if (envOption) {
    cachedShippingOptionId = envOption
    return envOption
  }
  return null
}

const listCartShippingOptions = async (cartId: string) => {
  try {
    const response = await medusa.shippingOptions.listCartOptions(cartId)
    return Array.isArray(response?.shipping_options) ? response.shipping_options : []
  } catch (error) {
    console.warn('[checkout] unable to list cart-specific shipping options', error)
    return []
  }
}

const listRegionShippingOptions = async (regionId: string) => {
  try {
    const response = await medusa.shippingOptions.list({
      region_id: regionId,
    })
    return Array.isArray(response?.shipping_options) ? response.shipping_options : []
  } catch (error) {
    console.warn('[checkout] unable to list region shipping options', error)
    return []
  }
}

const resolveShippingOptionId = async (cartId: string, regionId: string) => {
  const configured = resolveConfiguredShippingOptionId()
  if (configured) return configured

  const cartOptions = await listCartShippingOptions(cartId)
  const cartOption = cartOptions.find((opt: any) => opt && !opt.is_return)
  if (cartOption?.id) {
    cachedShippingOptionId = cartOption.id
    return cachedShippingOptionId
  }

  const regionOptions = await listRegionShippingOptions(regionId)
  const regionOption = regionOptions.find((opt: any) => opt && !opt.is_return)
  if (regionOption?.id) {
    cachedShippingOptionId = regionOption.id
    return cachedShippingOptionId
  }

  throw new Error('No shipping options configured for cart ' + cartId)
}

export const placeOrderDirectly = async (payload: DirectCheckoutPayload) => {
  const providerId = PAYMENT_PROVIDER_MAP[payload.paymentMethod]
  if (!providerId) {
    throw new Error('Unsupported payment provider')
  }

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

    for (const item of payload.items) {
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

  return medusa.carts.complete(addressedCart.id)
}

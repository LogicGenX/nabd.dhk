'use server'

import { medusa } from './medusa'

let cachedRegionId: string | null = null
let cachedShippingOptionId: string | null = null

const cleanEnv = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  return trimmed
}

export const resolveRegionId = async (): Promise<string> => {
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
    const client: any = medusa.shippingOptions
    if (typeof client?.listCartOptions !== 'function') {
      return []
    }
    const response = await client.listCartOptions(cartId)
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

export const resolveShippingOptionId = async (cartId: string, regionId: string) => {
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

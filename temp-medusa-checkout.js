const Medusa = require('./var/www/frontend-next/node_modules/@medusajs/medusa-js').default

const medusa = new Medusa({ baseUrl: 'https://medusa-backend-nabd.onrender.com', maxRetries: 0 })

const splitName = (full) => {
  if (!full) return { first_name: 'Customer', last_name: null }
  const parts = full.trim().split(/\s+/)
  if (parts.length <= 1) return { first_name: parts[0], last_name: null }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') || null }
}

const resolveRegionId = async () => {
  const { regions } = await medusa.regions.list()
  if (!regions?.length) throw new Error('No regions')
  return regions[0].id
}

const listCartOptions = async (cartId) => {
  try {
    const response = await medusa.shippingOptions.listCartOptions(cartId)
    return Array.isArray(response?.shipping_options) ? response.shipping_options : []
  } catch (err) {
    console.error('listCartOptions err', err?.response?.data || err.message)
    return []
  }
}

const listRegionOptions = async (regionId) => {
  const response = await medusa.shippingOptions.list({ region_id: regionId })
  return Array.isArray(response?.shipping_options) ? response.shipping_options : []
}

const resolveShippingOption = async (cartId, regionId) => {
  const cartOptions = await listCartOptions(cartId)
  const cartOption = cartOptions.find((opt) => opt && !opt.is_return)
  if (cartOption) return cartOption.id
  const regionOptions = await listRegionOptions(regionId)
  const option = regionOptions.find((opt) => opt && !opt.is_return)
  if (!option) throw new Error('no shipping option')
  return option.id
}

;(async () => {
  const payload = {
    items: [{ id: 'variant_01K9JFKDWVRS7J76S1PQM590CK', quantity: 1 }],
    name: 'John Doe',
    email: 'codex@example.com',
    phone: '+8801999999999',
    address: '123 Street',
    city: 'Dhaka',
    postalCode: '75090',
    country: 'BD',
    paymentMethod: 'cod',
  }
  const providerId = 'manual'
  const regionId = await resolveRegionId()
  const { cart } = await medusa.carts.create({ region_id: regionId })
  for (const item of payload.items) {
    await medusa.carts.lineItems.create(cart.id, { variant_id: item.id, quantity: item.quantity })
  }
  const { cart: refreshed } = await medusa.carts.retrieve(cart.id)
  const { first_name, last_name } = splitName(payload.name)
  const address = {
    first_name,
    last_name: last_name || undefined,
    address_1: payload.address,
    city: payload.city,
    postal_code: payload.postalCode,
    country_code: payload.country.toLowerCase(),
    phone: payload.phone,
  }
  const { cart: addressedCart } = await medusa.carts.update(refreshed.id, {
    email: payload.email,
    billing_address: address,
    shipping_address: address,
  })
  const shippingOptionId = await resolveShippingOption(addressedCart.id, regionId)
  console.log('Shipping option used:', shippingOptionId)
  await medusa.carts.addShippingMethod(addressedCart.id, { option_id: shippingOptionId, data: {} })
  await medusa.carts.createPaymentSessions(addressedCart.id)
  await medusa.carts.setPaymentSession(addressedCart.id, { provider_id: providerId })
  const completion = await medusa.carts.complete(addressedCart.id)
  console.log('Order created:', completion.data?.id)
})().catch((error) => {
  console.error('Script failed', error?.response?.data || error.message)
  process.exit(1)
})

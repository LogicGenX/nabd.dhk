const Medusa = require('./var/www/frontend-next/node_modules/@medusajs/medusa-js').default
const { splitName } = require('./var/www/frontend-next/lib/products')
const { resolveRegionId, resolveShippingOptionId } = require('./var/www/frontend-next/lib/server-cart')

process.env.NEXT_PUBLIC_MEDUSA_URL = 'https://medusa-backend-nabd.onrender.com'

const medusa = new Medusa({ baseUrl: process.env.NEXT_PUBLIC_MEDUSA_URL, maxRetries: 0 })

const payload = {
  cartId: null,
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

const PAYMENT_PROVIDER_MAP = { cod: 'manual', bkash: 'bkash' }

;(async () => {
  const providerId = PAYMENT_PROVIDER_MAP[payload.paymentMethod]
  let regionId = await resolveRegionId()
  let workingCartId
  const { cart: initialCart } = await medusa.carts.create({ region_id: regionId })
  for (const item of payload.items) {
    await medusa.carts.lineItems.create(initialCart.id, { variant_id: item.id, quantity: item.quantity })
  }
  const { cart: refreshed } = await medusa.carts.retrieve(initialCart.id)
  workingCartId = refreshed.id
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
  const { cart: addressedCart } = await medusa.carts.update(workingCartId, {
    email: payload.email,
    billing_address: address,
    shipping_address: address,
  })
  const shippingOptionId = await resolveShippingOptionId(addressedCart.id, regionId)
  console.log('shipping option', shippingOptionId)
  await medusa.carts.addShippingMethod(addressedCart.id, { option_id: shippingOptionId, data: {} })
  await medusa.carts.createPaymentSessions(addressedCart.id)
  await medusa.carts.setPaymentSession(addressedCart.id, { provider_id: providerId })
  const completion = await medusa.carts.complete(addressedCart.id)
  console.log('done', completion.type, completion.data?.id)
})().catch((error) => {
  console.error('failed', error?.response?.data || error.message)
  process.exit(1)
})

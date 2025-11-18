const DEFAULT_REGION_NAME = process.env.MEDUSA_DEFAULT_REGION_NAME || 'Bangladesh'
const DEFAULT_REGION_CURRENCY =
  (process.env.MEDUSA_DEFAULT_REGION_CURRENCY || 'bdt').toLowerCase()
const DEFAULT_REGION_COUNTRIES = (process.env.MEDUSA_DEFAULT_REGION_COUNTRIES || 'BD')
  .split(',')
  .map((entry) => entry.trim().toUpperCase())
  .filter(Boolean)
  .slice(0, 10)

const DEFAULT_PAYMENT_PROVIDERS = ['manual', 'bkash', 'cod']
const DEFAULT_FULFILLMENT_PROVIDERS = ['manual']
const DEFAULT_SHIPPING_NAME = process.env.MEDUSA_DEFAULT_SHIPPING_NAME || 'Standard'
const DEFAULT_SHIPPING_PROVIDER =
  process.env.MEDUSA_DEFAULT_SHIPPING_PROVIDER || 'manual'
const DEFAULT_SHIPPING_AMOUNT = Number.parseInt(
  process.env.MEDUSA_DEFAULT_SHIPPING_AMOUNT || '0',
  10,
)

let bootstrapPromise = null

const ensureShippingOption = async (
  shippingOptionService,
  shippingProfileService,
  region,
) => {
  const existing = await shippingOptionService
    .list({ region_id: region.id })
    .catch(() => [])
  const usable = existing.find((option) => option && !option.is_return)
  if (usable) {
    return usable
  }

  let profile = null
  try {
    profile = await shippingProfileService.retrieveDefault()
  } catch (error) {
    profile = null
  }
  if (!profile) {
    profile = await shippingProfileService.createDefault()
  }

  return shippingOptionService.create({
    name: DEFAULT_SHIPPING_NAME,
    region_id: region.id,
    provider_id: DEFAULT_SHIPPING_PROVIDER,
    amount: Number.isFinite(DEFAULT_SHIPPING_AMOUNT) ? DEFAULT_SHIPPING_AMOUNT : 0,
    data: {},
    is_return: false,
    price_type: 'flat_rate',
    profile_id: profile.id,
  })
}

const ensureRegion = async (scope) => {
  if (!scope || typeof scope.resolve !== 'function') {
    return
  }

  const regionService = scope.resolve('regionService')
  const paymentProviderService = scope.resolve('paymentProviderService')
  const fulfillmentProviderService = scope.resolve('fulfillmentProviderService')
  const shippingProfileService = scope.resolve('shippingProfileService')
  const shippingOptionService = scope.resolve('shippingOptionService')

  const regions = await regionService.list().catch(() => [])
  if (regions.length) {
    return regions[0]
  }

  await paymentProviderService.registerInstalledProviders(DEFAULT_PAYMENT_PROVIDERS)
  await fulfillmentProviderService.registerInstalledProviders(DEFAULT_FULFILLMENT_PROVIDERS)

  const region = await regionService.create({
    name: DEFAULT_REGION_NAME,
    currency_code: DEFAULT_REGION_CURRENCY,
    tax_rate: 0,
    payment_providers: DEFAULT_PAYMENT_PROVIDERS,
    fulfillment_providers: DEFAULT_FULFILLMENT_PROVIDERS,
    countries: DEFAULT_REGION_COUNTRIES,
  })

  await ensureShippingOption(shippingOptionService, shippingProfileService, region)
  return region
}

const scheduleBootstrap = (scope) => {
  if (!bootstrapPromise) {
    bootstrapPromise = ensureRegion(scope)
      .catch((error) => {
        console.warn('[store:ensure-region] bootstrap failed:', error?.message || error)
      })
      .finally(() => {
        bootstrapPromise = null
      })
  }
  return bootstrapPromise
}

module.exports = (router) => {
  router.use('/store/regions', (req, res, next) => {
    if (!req.scope) {
      return next()
    }
    scheduleBootstrap(req.scope)
      .catch(() => {
        // the error was logged above; allow the request to continue
      })
      .finally(() => next())
  })
}

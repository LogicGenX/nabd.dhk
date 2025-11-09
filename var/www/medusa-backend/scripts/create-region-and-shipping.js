#!/usr/bin/env node

/**
 * Idempotent bootstrapper that guarantees a usable Medusa region + shipping option
 * for checkout. It prefers environment-provided identifiers but can also create
 * sane defaults when none exist. Run this script after migrations and before
 * starting the HTTP server so the storefront API always has a valid region,
 * shipping option and pricing context to work with.
 */

const path = require('path')
const dotenv = require('dotenv')

const backendRoot = path.join(__dirname, '..')
dotenv.config({ path: path.join(backendRoot, '.env') })

const loadMedusa = () => {
  try {
    const pkg = require('@medusajs/medusa')
    return pkg.default || pkg
  } catch (error) {
    console.error('[region-bootstrap] Unable to load @medusajs/medusa:', error?.message || error)
    process.exit(1)
  }
}

const Medusa = loadMedusa()
const config = require(path.join(backendRoot, 'medusa-config'))

const medusa = new Medusa({
  projectConfig: config.projectConfig,
  plugins: config.plugins,
  modules: config.modules,
  featureFlags: config.featureFlags,
})

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')
const coerceId = (value) => {
  const normalized = normalizeString(value)
  return normalized || null
}
const parseCountries = (value) => {
  if (!value) return ['BD']
  return value
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 10)
}
const parseAmount = (value, fallback = 0) => {
  const normalized = Number(value)
  if (Number.isFinite(normalized) && normalized >= 0) {
    return Math.round(normalized)
  }
  return fallback
}

const REGION_NAME =
  normalizeString(process.env.MEDUSA_DEFAULT_REGION_NAME) || 'Bangladesh'
const REGION_CURRENCY =
  normalizeString(process.env.MEDUSA_DEFAULT_REGION_CURRENCY).toLowerCase() || 'bdt'
const REGION_COUNTRIES = parseCountries(process.env.MEDUSA_DEFAULT_REGION_COUNTRIES)
const SHIPPING_NAME =
  normalizeString(process.env.MEDUSA_DEFAULT_SHIPPING_NAME) || 'Standard'
const SHIPPING_PROVIDER =
  normalizeString(process.env.MEDUSA_DEFAULT_SHIPPING_PROVIDER) || 'manual'
const SHIPPING_AMOUNT = parseAmount(process.env.MEDUSA_DEFAULT_SHIPPING_AMOUNT, 0)

const REGION_ID_CANDIDATES = [
  process.env.MEDUSA_REGION_ID,
  process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
]
const SHIPPING_OPTION_ID_CANDIDATES = [
  process.env.MEDUSA_SHIPPING_OPTION_ID,
  process.env.NEXT_PUBLIC_MEDUSA_SHIPPING_OPTION_ID,
]

const preferredRegionId = REGION_ID_CANDIDATES.map(coerceId).find(Boolean) || null
const preferredShippingOptionId =
  SHIPPING_OPTION_ID_CANDIDATES.map(coerceId).find(Boolean) || null

const log = (...args) => console.log('[region-bootstrap]', ...args)
const warn = (...args) => console.warn('[region-bootstrap]', ...args)

const retrieveExistingRegion = async (id) => {
  if (!id) return null
  try {
    const region = await medusa.admin.regions.retrieve(id)
    if (region?.id) {
      log('Using configured region', region.id)
      return region
    }
  } catch (error) {
    warn('Preferred region id is not available:', error?.message || error)
  }
  return null
}

const findRegionByConfig = async () => {
  const result = await medusa.admin.regions.list()
  if (!result?.regions?.length) {
    return null
  }

  const normalizedCountries = REGION_COUNTRIES.join(',')
  const match =
    result.regions.find((region) => {
      if (!region) return false
      const currencyMatches =
        typeof region.currency_code === 'string' &&
        region.currency_code.toLowerCase() === REGION_CURRENCY
      const nameMatches =
        typeof region.name === 'string' &&
        region.name.trim().toLowerCase() === REGION_NAME.toLowerCase()
      const countries = Array.isArray(region.countries)
        ? region.countries.map((c) => (c?.iso_2 || c)?.toUpperCase()).filter(Boolean)
        : []
      const countriesMatch =
        countries.length &&
        countries.join(',') === normalizedCountries
      return currencyMatches && countriesMatch && nameMatches
    }) || result.regions[0]

  if (match?.id) {
    log('Re-using existing region', match.id)
    return match
  }
  return null
}

const ensureRegion = async () => {
  const preferred = await retrieveExistingRegion(preferredRegionId)
  if (preferred) return preferred

  const existing = await findRegionByConfig()
  if (existing) return existing

  log('Creating default region...')
  const region = await medusa.admin.regions.create({
    name: REGION_NAME,
    currency_code: REGION_CURRENCY,
    countries: REGION_COUNTRIES,
    tax_rate: 0,
  })
  log('Created region', region.id)
  return region
}

const retrieveExistingShippingOption = async (id) => {
  if (!id) return null
  try {
    const option = await medusa.admin.shippingOptions.retrieve(id)
    if (option?.id && option?.region_id) {
      log('Using configured shipping option', option.id)
      return option
    }
  } catch (error) {
    warn('Preferred shipping option id unavailable:', error?.message || error)
  }
  return null
}

const listRegionShippingOptions = async (regionId) => {
  const response = await medusa.admin.shippingOptions.list({ region_id: regionId })
  return Array.isArray(response?.shipping_options) ? response.shipping_options : []
}

const shouldUpdateOption = (option) => {
  if (!option) return false
  if (option.name !== SHIPPING_NAME) return true
  if (option.amount !== SHIPPING_AMOUNT) return true
  if (option.provider_id !== SHIPPING_PROVIDER) return true
  if (option.is_return) return true
  return false
}

const updateShippingOption = async (optionId, regionId, profileId) => {
  const payload = {
    name: SHIPPING_NAME,
    amount: SHIPPING_AMOUNT,
    provider_id: SHIPPING_PROVIDER,
    region_id: regionId,
    data: {},
    is_return: false,
    price_type: 'flat_rate',
  }
  if (profileId) {
    payload.profile_id = profileId
  }
  await medusa.admin.shippingOptions.update(optionId, payload)
  log('Updated shipping option', optionId)
  return optionId
}

const resolveShippingProfileId = async () => {
  const fromEnv = coerceId(process.env.MEDUSA_DEFAULT_SHIPPING_PROFILE_ID)
  if (fromEnv) {
    try {
      const profile = await medusa.admin.shippingProfiles.retrieve(fromEnv)
      if (profile?.id) {
        return profile.id
      }
    } catch (error) {
      warn('Configured shipping profile id invalid:', error?.message || error)
    }
  }

  try {
    const response = await medusa.admin.shippingProfiles.list()
    const profiles = Array.isArray(response?.shipping_profiles)
      ? response.shipping_profiles
      : []
    const preferred =
      profiles.find((profile) => profile?.type === 'default') || profiles[0]
    return preferred?.id || null
  } catch (error) {
    warn('Unable to list shipping profiles:', error?.message || error)
  }

  return null
}

const ensureShippingOption = async (region) => {
  const preferred = await retrieveExistingShippingOption(preferredShippingOptionId)
  if (preferred && preferred.region_id === region.id && !preferred.is_return) {
    if (shouldUpdateOption(preferred)) {
      const profileId = preferred.profile_id || (await resolveShippingProfileId())
      await updateShippingOption(preferred.id, region.id, profileId)
    }
    return preferred.id
  }

  const options = await listRegionShippingOptions(region.id)
  const existing = options.find(
    (option) => option && !option.is_return && option.provider_id === SHIPPING_PROVIDER,
  )
  if (existing) {
    if (shouldUpdateOption(existing)) {
      const profileId = existing.profile_id || (await resolveShippingProfileId())
      await updateShippingOption(existing.id, region.id, profileId)
    } else {
      log('Re-using shipping option', existing.id)
    }
    return existing.id
  }

  const profileId = await resolveShippingProfileId()
  const payload = {
    name: SHIPPING_NAME,
    region_id: region.id,
    provider_id: SHIPPING_PROVIDER,
    amount: SHIPPING_AMOUNT,
    data: {},
    is_return: false,
    price_type: 'flat_rate',
  }
  if (profileId) {
    payload.profile_id = profileId
  }
  const option = await medusa.admin.shippingOptions.create(payload)
  log('Created shipping option', option.id)
  return option.id
}

const main = async () => {
  const region = await ensureRegion()
  const shippingId = await ensureShippingOption(region)
  log('Bootstrap complete', { regionId: region.id, shippingOptionId: shippingId })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[region-bootstrap] Failed:', error?.message || error)
    if (error?.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  })

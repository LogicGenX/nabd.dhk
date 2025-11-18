#!/usr/bin/env node

/**
 * Idempotent bootstrapper that guarantees a usable Medusa region + shipping option
 * for checkout. It prefers environment-provided identifiers but can also create
 * sane defaults when none exist. Run this script after migrations and before
 * starting the HTTP server so the storefront API always has a valid pricing context.
 */

const fs = require('fs')
const path = require('path')
const express = require('express')

const backendRoot = path.join(__dirname, '..')
const envPath = path.join(backendRoot, '.env')

const loadEnv = () => {
  try {
    const dotenv = require('dotenv')
    dotenv.config({ path: envPath })
    return
  } catch (error) {
    console.warn('[region-bootstrap] dotenv not available, falling back to manual .env parser')
  }

  if (!fs.existsSync(envPath)) {
    return
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  lines.forEach((line) => {
    if (!line || line.trim().startsWith('#')) return
    const idx = line.indexOf('=')
    if (idx === -1) return
    const key = line.slice(0, idx).trim()
    if (!key) return
    let value = line.slice(idx + 1)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = value
    }
  })
}

loadEnv()

const loadMedusaProject = async () => {
  try {
    const loaderModule = require('@medusajs/medusa/dist/loaders')
    const loader = loaderModule.default || loaderModule
    if (typeof loader !== 'function') {
      throw new Error('Invalid Medusa loader export')
    }
    return await loader({
      directory: backendRoot,
      expressApp: express(),
      isTest: false,
    })
  } catch (error) {
    console.error('[region-bootstrap] Unable to load Medusa project:', error?.message || error)
    throw error
  }
}

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

const buildServiceContext = (container) => ({
  regionService: container.resolve('regionService'),
  shippingOptionService: container.resolve('shippingOptionService'),
  shippingProfileService: container.resolve('shippingProfileService'),
  paymentProviderService: container.resolve('paymentProviderService'),
  fulfillmentProviderService: container.resolve('fulfillmentProviderService'),
})

const retrieveExistingRegion = async (regionService, id) => {
  if (!id) return null
  try {
    const region = await regionService.retrieve(id, { relations: ['countries'] })
    if (region?.id) {
      log('Using configured region', region.id)
      return region
    }
  } catch (error) {
    warn('Preferred region id is not available:', error?.message || error)
  }
  return null
}

const findRegionByConfig = async (regionService) => {
  const regions = await regionService.list({}, { relations: ['countries'] })
  if (!regions?.length) {
    return null
  }

  const normalizedCountries = REGION_COUNTRIES.join(',')
  const match =
    regions.find((region) => {
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
        countries.length && countries.join(',') === normalizedCountries
      return currencyMatches && countriesMatch && nameMatches
    }) || regions[0]

  if (match?.id) {
    log('Re-using existing region', match.id)
    return match
  }
  return null
}

const resolveProviderIds = async (paymentProviderService, fulfillmentProviderService) => {
  const [payments, fulfillments] = await Promise.all([
    paymentProviderService.list(),
    fulfillmentProviderService.list(),
  ])
  const paymentIds = (payments || []).map((provider) => provider?.id).filter(Boolean)
  const fulfillmentIds = (fulfillments || [])
    .map((provider) => provider?.id)
    .filter(Boolean)

  if (!paymentIds.length) {
    throw new Error('No payment providers registered in Medusa')
  }
  if (!fulfillmentIds.length) {
    throw new Error('No fulfillment providers registered in Medusa')
  }

  return { paymentIds, fulfillmentIds }
}

const ensureRegion = async (services) => {
  const { regionService, paymentProviderService, fulfillmentProviderService } = services
  const preferred = await retrieveExistingRegion(regionService, preferredRegionId)
  if (preferred) return preferred

  const existing = await findRegionByConfig(regionService)
  if (existing) return existing

  const { paymentIds, fulfillmentIds } = await resolveProviderIds(
    paymentProviderService,
    fulfillmentProviderService,
  )

  log('Creating default region...')
  const region = await regionService.create({
    name: REGION_NAME,
    currency_code: REGION_CURRENCY,
    tax_rate: 0,
    payment_providers: paymentIds,
    fulfillment_providers: fulfillmentIds,
    countries: REGION_COUNTRIES,
  })
  log('Created region', region.id)
  return region
}

const retrieveExistingShippingOption = async (shippingOptionService, id) => {
  if (!id) return null
  try {
    const option = await shippingOptionService.retrieve(id)
    if (option?.id && option?.region_id) {
      log('Using configured shipping option', option.id)
      return option
    }
  } catch (error) {
    warn('Preferred shipping option id unavailable:', error?.message || error)
  }
  return null
}

const listRegionShippingOptions = async (shippingOptionService, regionId) => {
  try {
    const options = await shippingOptionService.list({ region_id: regionId })
    return Array.isArray(options) ? options : []
  } catch (error) {
    warn('Unable to list region shipping options', error?.message || error)
  }
  return []
}

const shouldUpdateOption = (option) => {
  if (!option) return false
  if (option.name !== SHIPPING_NAME) return true
  if (option.amount !== SHIPPING_AMOUNT) return true
  if (option.provider_id !== SHIPPING_PROVIDER) return true
  if (option.is_return) return true
  return false
}

const resolveShippingProfileId = async (shippingProfileService) => {
  const fromEnv = coerceId(process.env.MEDUSA_DEFAULT_SHIPPING_PROFILE_ID)
  if (fromEnv) {
    try {
      const profile = await shippingProfileService.retrieve(fromEnv)
      if (profile?.id) {
        return profile.id
      }
    } catch (error) {
      warn('Configured shipping profile id invalid:', error?.message || error)
    }
  }

  const existing = await shippingProfileService.retrieveDefault()
  if (existing?.id) {
    return existing.id
  }

  const created = await shippingProfileService.createDefault()
  return created.id
}

const updateShippingOption = async (
  shippingOptionService,
  optionId,
  regionId,
  profileId,
) => {
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
  await shippingOptionService.update(optionId, payload)
  log('Updated shipping option', optionId)
  return optionId
}

const ensureShippingOption = async (services, region) => {
  const { shippingOptionService, shippingProfileService } = services
  const preferred = await retrieveExistingShippingOption(
    shippingOptionService,
    preferredShippingOptionId,
  )
  if (preferred && preferred.region_id === region.id && !preferred.is_return) {
    if (shouldUpdateOption(preferred)) {
      const profileId = preferred.profile_id || (await resolveShippingProfileId(shippingProfileService))
      await updateShippingOption(shippingOptionService, preferred.id, region.id, profileId)
    }
    return preferred.id
  }

  const options = await listRegionShippingOptions(shippingOptionService, region.id)
  const existing = options.find(
    (option) => option && !option.is_return && option.provider_id === SHIPPING_PROVIDER,
  )
  if (existing) {
    if (shouldUpdateOption(existing)) {
      const profileId = existing.profile_id || (await resolveShippingProfileId(shippingProfileService))
      await updateShippingOption(shippingOptionService, existing.id, region.id, profileId)
    } else {
      log('Re-using shipping option', existing.id)
    }
    return existing.id
  }

  const profileId = await resolveShippingProfileId(shippingProfileService)
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
  const option = await shippingOptionService.create(payload)
  log('Created shipping option', option.id)
  return option.id
}

const main = async () => {
  const medusaApp = await loadMedusaProject()
  try {
    const services = buildServiceContext(medusaApp.container)
    const region = await ensureRegion(services)
    const shippingId = await ensureShippingOption(services, region)
    log('Bootstrap complete', { regionId: region.id, shippingOptionId: shippingId })
  } finally {
    try {
      if (typeof medusaApp.prepareShutdown === 'function') {
        await medusaApp.prepareShutdown()
      }
    } catch (error) {
      warn('prepareShutdown failed', error?.message || error)
    }
    try {
      if (typeof medusaApp.shutdown === 'function') {
        await medusaApp.shutdown()
      }
    } catch (error) {
      warn('shutdown failed', error?.message || error)
    }
  }
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

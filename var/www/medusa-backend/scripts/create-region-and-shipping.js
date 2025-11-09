#!/usr/bin/env node
const Medusa = require('@medusajs/medusa').default || require('@medusajs/medusa')
const path = require('path')

const backendRoot = path.join(__dirname, '..')
const config = require(path.join(backendRoot, 'medusa-config'))

const medusa = new Medusa({
  projectConfig: config.projectConfig,
  plugins: config.plugins,
  modules: config.modules,
  featureFlags: config.featureFlags,
})

const createRegion = async () => {
  const existing = await medusa.admin.regions.list()
  if (existing.regions && existing.regions.length) {
    const head = existing.regions[0]
    console.log('Using existing region', head.id)
    return head.id
  }
  const region = await medusa.admin.regions.create({
    name: 'Bangladesh',
    currency_code: 'bdt',
    countries: ['BD'],
  })
  console.log('Created region', region.id)
  return region.id
}

const createShippingOption = async (regionId) => {
  const options = await medusa.admin.shippingOptions.list({ region_id: regionId })
  const existing = options.shipping_options?.find((opt) => !opt.is_return)
  if (existing) {
    console.log('Using existing shipping option', existing.id)
    return existing.id
  }
  const shipping = await medusa.admin.shippingOptions.create({
    name: 'Standard',
    region_id: regionId,
    provider_id: 'manual',
    amount: 0,
  })
  console.log('Created shipping option', shipping.id)
  return shipping.id
}

const main = async () => {
  try {
    const regionId = await createRegion()
    const shippingId = await createShippingOption(regionId)
    console.log('Success:', { regionId, shippingId })
    process.exit(0)
  } catch (error) {
    console.error('Failed to create entries', error)
    process.exit(1)
  }
}

main()

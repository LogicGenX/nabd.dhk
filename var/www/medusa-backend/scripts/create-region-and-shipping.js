const Medusa = require('@medusajs/medusa')
const config = require('../medusa-config')

const medusa = new Medusa({ projectConfig: config.projectConfig })

async function main() {
  const region = await medusa.admin.regions.create({
    name: 'Bangladesh',
    currency_code: 'bdt',
    countries: ['BD'],
  })
  console.log('region id:', region.id)

  const shipping = await medusa.admin.shippingOptions.create({
    name: 'Standard',
    region_id: region.id,
    provider_id: 'manual',
    amount: 0,
  })
  console.log('shipping option id:', shipping.id)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
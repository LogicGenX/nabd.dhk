import Medusa from '@medusajs/medusa-js'

const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:7001'
export const medusa = new Medusa({ baseUrl: medusaUrl, maxRetries: 3 })

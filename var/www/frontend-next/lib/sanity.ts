import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_READ_TOKEN

export const sanity = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2023-05-03',
      useCdn: !token,
      token
    })
  : ({ fetch: async () => [] } as any)

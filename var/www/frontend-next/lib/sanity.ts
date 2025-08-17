import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

if (!projectId || !dataset) {
  throw new Error(
    'Missing Sanity configuration: NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET',
  )
}

const token = process.env.SANITY_API_READ_TOKEN

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion: '2025-02-06',
  useCdn: !token,
  ...(token ? { token } : {}),
})

import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID

export const sanity = projectId
  ? createClient({
      projectId,
      dataset: 'production',
      useCdn: true,
      apiVersion: '2023-05-03'
    })
  : { fetch: async () => [] } as any

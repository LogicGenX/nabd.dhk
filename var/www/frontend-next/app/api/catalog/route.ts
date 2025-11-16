import { NextResponse } from 'next/server'

import { getCategorySummaries, getCollectionSummaries } from '../../../lib/catalog'

export const runtime = 'nodejs'

export const GET = async () => {
  try {
    const [collections, categories] = await Promise.all([getCollectionSummaries(), getCategorySummaries()])
    return NextResponse.json({ collections, categories })
  } catch (error) {
    console.error('[catalog] api failed', error)
    return NextResponse.json({ collections: [], categories: [] }, { status: 200 })
  }
}

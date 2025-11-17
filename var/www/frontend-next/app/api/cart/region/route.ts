import { NextResponse } from 'next/server'

import { resolveRegionId } from '../../../../lib/server-cart'

export const runtime = 'nodejs'

export const GET = async () => {
  try {
    const regionId = await resolveRegionId()
    return NextResponse.json({ regionId })
  } catch (error) {
    console.error('[cart] failed to resolve region id', error)
    return NextResponse.json({ regionId: null }, { status: 500 })
  }
}

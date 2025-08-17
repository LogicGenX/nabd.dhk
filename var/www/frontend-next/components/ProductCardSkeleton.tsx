'use client'

import Skeleton from './Skeleton'

export default function ProductCardSkeleton() {
  return (
    <div className="block">
      <Skeleton className="h-56 w-full" />
      <div className="mt-2 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

"use client"

import Skeleton from './Skeleton'

export default function ProductPageSkeleton() {
  return (
    <main className="p-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-4">
          <Skeleton className="w-full aspect-square" />
          <Skeleton className="w-full aspect-square" />
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </main>
  )
}

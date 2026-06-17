import React from 'react'

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-48 bg-muted/60 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

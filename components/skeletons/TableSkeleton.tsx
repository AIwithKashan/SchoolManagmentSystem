import React from 'react'

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="h-10 bg-muted/60 rounded animate-pulse" />
      {/* Table rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-16 bg-muted/30 rounded animate-pulse" />
      ))}
    </div>
  )
}

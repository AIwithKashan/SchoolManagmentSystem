'use client'
import React from 'react'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted/60 rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted/60 rounded animate-pulse" />
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/60 rounded-xl animate-pulse" />
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-muted/60 rounded-xl animate-pulse" />
        <div className="h-64 bg-muted/60 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

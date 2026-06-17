import React from "react";

export function StudentTableSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-10 bg-slate-800 rounded-lg w-full" />
      <div className="border border-gray-800 rounded-xl divide-y divide-gray-800 bg-slate-900/20">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              <div className="size-10 bg-slate-800/60 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-800/60 rounded w-24" />
                <div className="h-3 bg-slate-800/60 rounded w-16" />
              </div>
            </div>
            <div className="h-4 bg-slate-800/60 rounded w-16" />
            <div className="h-4 bg-slate-800/60 rounded w-20" />
            <div className="h-4 bg-slate-800/60 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeacherTableSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-10 bg-slate-800 rounded-lg w-full" />
      <div className="border border-gray-800 rounded-xl divide-y divide-gray-800 bg-slate-900/20">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              <div className="size-10 bg-slate-800/60 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-800/60 rounded w-32" />
                <div className="h-3 bg-slate-800/60 rounded w-20" />
              </div>
            </div>
            <div className="h-4 bg-slate-800/60 rounded w-24" />
            <div className="h-4 bg-slate-800/60 rounded w-28" />
            <div className="h-6 bg-slate-800/60 rounded-full w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-6 rounded-2xl bg-slate-900/20 border border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-800/60 rounded w-20" />
            <div className="size-8 bg-slate-800/60 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-slate-800/60 rounded w-16" />
            <div className="h-3 bg-slate-800/60 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse max-w-2xl w-full mx-auto p-4">
      {[...Array(3)].map((_, i) => {
        const isLeft = i % 2 === 0;
        return (
          <div key={i} className={`flex items-start gap-3 ${isLeft ? "" : "flex-row-reverse"}`}>
            <div className="size-8 bg-slate-800/60 rounded-full shrink-0" />
            <div className={`space-y-2 max-w-[70%] p-3 rounded-2xl ${isLeft ? "bg-slate-900/20 border border-gray-800" : "bg-purple-900/10"}`}>
              <div className="h-3 bg-slate-800/60 rounded w-24" />
              <div className="h-3.5 bg-slate-800/60 rounded w-48" />
              <div className="h-3 bg-slate-800/60 rounded w-36" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClassCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-6 rounded-2xl bg-slate-900/20 border border-gray-800 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-5 bg-slate-800/60 rounded w-28" />
              <div className="h-3.5 bg-slate-800/60 rounded w-20" />
            </div>
            <div className="size-9 bg-slate-800/60 rounded-full" />
          </div>
          <div className="pt-4 border-t border-gray-800 flex justify-between">
            <div className="h-3 bg-slate-800/60 rounded w-16" />
            <div className="h-3 bg-slate-800/60 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttendanceGridSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="h-12 bg-slate-800/60 rounded-xl w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-gray-800 bg-slate-900/20 flex flex-col items-center space-y-3">
            <div className="size-10 bg-slate-800/60 rounded-full" />
            <div className="h-3.5 bg-slate-800/60 rounded w-16" />
            <div className="flex gap-2 w-full pt-1 justify-center">
              <div className="size-5 bg-slate-800/60 rounded animate-pulse" />
              <div className="size-5 bg-slate-800/60 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

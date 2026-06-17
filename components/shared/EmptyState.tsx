"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string | null;
  onAction?: (() => void) | null;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="w-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-white/[0.05] bg-slate-900/35 backdrop-blur-sm select-none">
      {/* Icon Area */}
      <div className="size-14 rounded-2xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
        <Icon className="size-6 text-blue-400" />
      </div>

      {/* Heading & Text */}
      <h3 className="text-lg font-bold text-slate-100 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {/* Optional CTA Button */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl h-10 px-5 flex items-center gap-1.5 shadow-md shadow-blue-600/15 cursor-pointer active:scale-[0.98] transition-all"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;

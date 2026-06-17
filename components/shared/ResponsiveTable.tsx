import React from "react";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: React.ReactNode;
  accessor?: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
  // Options for card rendering
  hideInMobileCard?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  
  // Custom headers for card layout on mobile
  mobileCardHeader?: (row: T) => React.ReactNode;
  mobileCardSubtitle?: (row: T) => React.ReactNode;
  
  // Actions at the end/bottom
  actions?: (row: T) => React.ReactNode;
  
  // Selectable row support
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectRow?: (row: T, checked: boolean) => void;
  rowIdAccessor?: (row: T) => string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  loading = false,
  loadingText = "Fetching records...",
  emptyText = "No records found",
  emptyIcon,
  mobileCardHeader,
  mobileCardSubtitle,
  actions,
  selectable = false,
  selectedIds = new Set(),
  onSelectAll,
  onSelectRow,
  rowIdAccessor,
}: ResponsiveTableProps<T>) {
  const isMobile = useMobileDetect();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="size-8 text-blue-500 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">{loadingText}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        {emptyIcon || <span className="text-gray-300 font-semibold text-lg">{emptyText}</span>}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4 p-4">
        {data.map((row, idx) => {
          const rowId = rowIdAccessor && rowIdAccessor(row) || String(idx);
          const isSelected = selectedIds.has(rowId);

          return (
            <Card
              key={rowId}
              className={cn(
                "glass-card border-gray-800 bg-slate-900/40 relative overflow-hidden transition-all",
                isSelected && "border-blue-500/50 bg-slate-900/70 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
              )}
            >
              <CardContent className="p-4 space-y-3">
                {/* Mobile Header Row: Checkbox + Custom Title + Subtitle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    {selectable && (
                      <input
                        type="checkbox"
                        className="rounded border-gray-700 bg-slate-950 text-blue-600 focus:ring-0 scale-110 mt-1 cursor-pointer"
                        checked={isSelected}
                        onChange={(e) => onSelectRow?.(row, e.target.checked)}
                      />
                    )}
                    <div className="flex flex-col gap-0.5">
                      {mobileCardHeader ? (
                        mobileCardHeader(row)
                      ) : (
                        <span className="font-semibold text-white">Item #{idx + 1}</span>
                      )}
                      {mobileCardSubtitle && mobileCardSubtitle(row)}
                    </div>
                  </div>
                </div>

                {/* Key-Value Fields */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-gray-800/40 text-xs">
                  {columns.map((col, cIdx) => {
                    if (col.hideInMobileCard) return null;
                    
                    const value = col.render 
                      ? col.render(row) 
                      : (col.accessor ? (row as any)[col.accessor] : null);

                    return (
                      <div key={cIdx} className="space-y-0.5">
                        <span className="text-gray-500 font-medium block uppercase tracking-wider text-[9px]">
                          {col.header}
                        </span>
                        <div className="text-gray-200 font-medium">{value}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Full Width Actions Button Panel */}
                {actions && (
                  <div className="pt-3 border-t border-gray-800/40 flex justify-end">
                    <div className="w-full flex justify-end gap-2 flex-wrap sm:flex-nowrap">
                      {actions(row)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop layout
  const allChecked = data.length > 0 && selectedIds.size === data.length;

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-gray-800/80 bg-slate-950/50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {selectable && (
            <th className="py-3 px-4 w-10">
              <input
                type="checkbox"
                className="rounded border-gray-700 bg-slate-950 text-blue-600 focus:ring-0 scale-100 cursor-pointer"
                checked={allChecked}
                onChange={(e) => onSelectAll?.(e.target.checked)}
              />
            </th>
          )}
          {columns.map((col, idx) => (
            <th key={idx} className={cn("py-3 px-4", col.className)}>
              {col.header}
            </th>
          ))}
          {actions && <th className="py-3 px-4 text-right">Actions</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-800/40 text-sm">
        {data.map((row, idx) => {
          const rowId = rowIdAccessor && rowIdAccessor(row) || String(idx);
          const isSelected = selectedIds.has(rowId);

          return (
            <tr
              key={rowId}
              className={cn(
                "hover:bg-slate-800/10 transition-all duration-150",
                isSelected && "bg-blue-500/5 hover:bg-blue-500/10"
              )}
            >
              {selectable && (
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    className="rounded border-gray-700 bg-slate-950 text-blue-600 focus:ring-0 scale-100 cursor-pointer"
                    checked={isSelected}
                    onChange={(e) => onSelectRow?.(row, e.target.checked)}
                  />
                </td>
              )}
              {columns.map((col, cIdx) => {
                const cellVal = col.render 
                  ? col.render(row) 
                  : (col.accessor ? (row as any)[col.accessor] : null);

                return (
                  <td key={cIdx} className={cn("py-3 px-4", col.className)}>
                    {cellVal}
                  </td>
                );
              })}
              {actions && (
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {actions(row)}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

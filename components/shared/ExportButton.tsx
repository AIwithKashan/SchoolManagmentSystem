"use client";

import React, { useState } from "react";
import { Download, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  data: any[];
  type?: "pdf" | "excel" | "both";
  filename?: string;
  exportFunction: (data: any[], format: "pdf" | "excel") => void | Promise<void>;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({
  data,
  type = "both",
  filename = "export",
  exportFunction,
  className,
  variant = "outline",
  size = "default",
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: "pdf" | "excel") => {
    if (data.length === 0) {
      toast.error("No records available to export");
      return;
    }

    setLoading(true);
    toast.info("Generating download... ⏳");

    try {
      // Small artificial delay for visual feedback/generation load
      await new Promise((resolve) => setTimeout(resolve, 800));
      await exportFunction(data, format);
      toast.success("Download started! 📄");
    } catch (err) {
      console.error("[EXPORT_ERROR]", err);
      toast.error("Failed to generate file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isIconOnly = size === "icon";

  if (type === "both") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={loading}
          className={cn(buttonVariants({ variant, size, className }))}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Download className="size-4 mr-2" />
          )}
          {loading ? "Generating..." : "Export"}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-slate-900 border-white/[0.08] text-white">
          <DropdownMenuItem
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 text-xs py-2"
          >
            <FileText className="size-3.5 text-red-400" />
            Export to PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 text-xs py-2"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-400" />
            Export to Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Single format button
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => handleExport(type as "pdf" | "excel")}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin mr-2" />
      ) : (
        <Download className="size-4 mr-2" />
      )}
      {loading
        ? "Generating..."
        : type === "pdf"
        ? "Download PDF"
        : "Export Excel"}
    </Button>
  );
}

export default ExportButton;

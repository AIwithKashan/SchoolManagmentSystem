"use client";

import React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintReceiptButton() {
  return (
    <Button
      onClick={() => window.print()}
      className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-violet-900/20 flex items-center gap-1.5 no-print"
    >
      <Printer className="size-4" />
      Print Receipt
    </Button>
  );
}

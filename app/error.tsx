"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[NextAppError]", error);
  }, [error]);

  const errorId = error.digest || "ERR-" + Math.floor(100000 + Math.random() * 900000);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-950 text-white selection:bg-red-500/20">
      {/* Background radial effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0,transparent_55%)] pointer-events-none" />

      <div className="relative max-w-md w-full space-y-6 z-10">
        {/* Error icon wrapper */}
        <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto animate-pulse">
          <AlertTriangle className="size-8 animate-bounce" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">Something went wrong</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            EduMind AI encountered an unexpected layout crash. Our healing systems are assessing the incident reports.
          </p>
        </div>

        {/* Support Reference */}
        <div className="py-2.5 px-4 rounded-xl bg-gray-900/60 border border-white/[0.04] text-[10px] text-gray-500 font-mono inline-block">
          Support ID: <span className="text-red-400 font-bold">{errorId}</span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => reset()}
            className="bg-gray-800 hover:bg-gray-700/80 border border-gray-700 text-gray-200 font-semibold h-10 px-5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="size-4" />
            Try Again
          </Button>

          <Link href="/">
            <Button
              className="bg-blue-650 hover:bg-blue-550 text-white font-semibold h-10 px-5 w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="size-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

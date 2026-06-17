"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === "production") {
      console.error("[ErrorBoundary] Caught error:", error);
    } else {
      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV !== "production";

      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 text-center bg-gray-950 text-white rounded-2xl border border-white/[0.06]">
          <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 animate-bounce">
            <AlertTriangle className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm max-w-md mb-6">
            An unexpected error occurred in this view. Try reloading or check back shortly.
          </p>

          {isDev && this.state.error && (
            <div className="w-full max-w-lg mb-6 p-4 rounded-xl bg-black/60 border border-red-500/20 text-left font-mono text-xs text-red-300 overflow-auto max-h-48 scrollbar-thin">
              <p className="font-bold">{this.state.error.toString()}</p>
              {this.state.error.stack && (
                <pre className="mt-2 text-[10px] text-gray-500 leading-normal">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}

          <Button
            onClick={this.handleReset}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl h-10 px-6 cursor-pointer"
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

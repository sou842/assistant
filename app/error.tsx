"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex min-h-screen flex-col items-center justify-center p-10 bg-app-surface text-app-text-primary">
      <div className="flex flex-col items-center text-center max-w-lg p-8">
        <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-app-danger-strong ring-4 ring-red-500/5">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-3">Something went wrong</h1>
        <p className="text-sm text-app-text-secondary mb-8 leading-relaxed max-w-sm">
          An unexpected error occurred while trying to load this page. Our team has been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center h-11 px-6 rounded-full cursor-pointer bg-app-primary text-app-primary-foreground text-sm font-medium hover:bg-app-primary-hover shadow-lg shadow-app-primary/20 transition-all active:scale-95"
          >
            <RotateCcw className="mr-2 size-4" />
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center h-11 px-6 rounded-full cursor-pointer bg-app-surface-glass-strong text-app-text-primary text-sm font-medium hover:bg-app-surface-hover transition-all active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

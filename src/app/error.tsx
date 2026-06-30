"use client";

/**
 * Global error boundary — catches unexpected runtime errors in any route
 * segment and offers a recovery path. Must be a Client Component.
 */
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would forward to an error reporter (Sentry etc.).
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error occurred while rendering this page. You can try
          again — if the problem persists, refresh the browser.
        </p>
      </div>
      <Button onClick={reset} className="gap-2 rounded-full">
        <RotateCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

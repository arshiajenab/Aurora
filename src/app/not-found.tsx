import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Global 404 — premium, on-brand, with a clear way home.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Soft radial backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]"
      >
        <div className="absolute inset-0 bg-grid" />
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground">
          <Compass className="h-7 w-7" />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-luxe text-muted-foreground">
            Error 404
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            This page drifted off-course.
          </h1>
          <p className="max-w-md text-balance text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have
            moved. Let&apos;s get you back to something beautiful.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="gap-2 rounded-full">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/products">Browse the catalog</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

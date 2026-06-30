/**
 * Global loading UI — shown while route segments stream. A minimal, premium
 * centered indicator keeps perceived latency low without a full skeleton.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative h-8 w-8">
        <span className="absolute inset-0 rounded-full border border-border" />
        <span className="absolute inset-0 rounded-full border border-transparent border-t-foreground animate-spin" />
      </div>
      <p className="text-xs uppercase tracking-luxe text-muted-foreground">
        Loading
      </p>
    </div>
  );
}

/**
 * Compare page loading skeleton — matches CompareView's pre-mount skeleton
 * so the route transition feels seamless.
 */
export default function CompareLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-3">
        <div className="h-3 w-20 skeleton-shimmer rounded" />
        <div className="h-9 w-40 skeleton-shimmer rounded" />
      </div>
      <div className="mt-6 h-px w-full bg-border/60" />
      <div className="mt-6 flex gap-4 overflow-hidden">
        <div className="h-72 w-44 shrink-0 skeleton-shimmer rounded-2xl" />
        <div className="h-72 w-[240px] shrink-0 skeleton-shimmer rounded-2xl" />
        <div className="h-72 w-[240px] shrink-0 skeleton-shimmer rounded-2xl" />
        <div className="hidden h-72 w-[240px] shrink-0 skeleton-shimmer rounded-2xl sm:block" />
      </div>
    </div>
  );
}

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Products table loading skeleton. */
export default function AdminProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <Card className="rounded-2xl p-0">
        <div className="px-6 py-3">
          <Skeleton className="h-3 w-full" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-border/40 px-6 py-3"
          >
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </Card>
    </div>
  );
}

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loading skeleton — matches the dashboard's section rhythm
 * (KPI grid → chart → two-column) so the layout doesn't jump on load.
 */
export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="gap-3 rounded-2xl p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>

      {/* Chart card */}
      <Card className="rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="mt-6 h-[280px] w-full rounded-xl" />
      </Card>

      {/* Two-column */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="rounded-2xl p-0 lg:col-span-3">
          <div className="border-b border-border/60 p-6 pb-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
          <div className="p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="ml-auto h-3 w-12" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-2xl p-6 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mx-auto mt-6 h-[200px] w-[200px] rounded-full" />
          <div className="mt-6 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

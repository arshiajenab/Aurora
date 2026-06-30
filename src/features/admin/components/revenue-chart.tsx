"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { RevenuePoint } from "@/types";

/**
 * RevenueChart — the hero chart on the admin dashboard.
 *
 * A single-series area chart with a gradient fill pinned to the `chart-1`
 * token. Recharts requires an explicit-height parent for
 * `ResponsiveContainer`, so the ChartContainer is wrapped in `h-[280px]`.
 *
 * Minimal chrome: hairline grid only on the Y axis (1 line), no X grid,
 * tick text styled as muted. The custom tooltip uses the shadcn
 * `ChartTooltipContent` so the look stays consistent with the rest of the
 * design system.
 */

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            horizontal
            stroke="var(--border)"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickMargin={8}
            tickFormatter={(v: number) => formatCompactCurrency(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {formatCurrency(Number(value))}
                  </span>
                )}
                labelFormatter={(label) => (
                  <span className="text-muted-foreground">{label}</span>
                )}
                indicator="dot"
              />
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-revenue)"
            strokeWidth={2}
            fill="url(#fillRevenue)"
            dot={false}
            activeDot={{
              r: 3.5,
              fill: "var(--color-revenue)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

"use client";

import * as React from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * InventoryChart — a monochrome donut showing the stock health split.
 *
 * Three segments (in-stock / low-stock / out-of-stock) keyed to the
 * `chart-1..3` tokens. A centered label renders the total catalog size so
 * the donut reads as a single "inventory health" glyph at a glance.
 *
 * The accompanying legend is rendered by the parent (dashboard) so the
 * layout can pair it with the low-stock warning list.
 */

export type InventoryDatum = {
  key: "inStock" | "lowStock" | "outOfStock";
  label: string;
  value: number;
  color: string;
};

const chartConfig = {
  inStock: { label: "In stock", color: "var(--chart-1)" },
  lowStock: { label: "Low stock", color: "var(--chart-2)" },
  outOfStock: { label: "Out of stock", color: "var(--destructive)" },
} satisfies ChartConfig;

export function InventoryChart({
  data,
  total,
}: {
  data: InventoryDatum[];
  total: number;
}) {
  const chartData = data.filter((d) => d.value > 0);

  return (
    <div className="relative h-[200px] w-full">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square h-full"
      >
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="key"
            innerRadius={56}
            outerRadius={84}
            paddingAngle={2}
            stroke="var(--background)"
            strokeWidth={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <g>
                    <text
                      x={cx}
                      y={cy - 6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-2xl font-semibold tabular-nums"
                    >
                      {total}
                    </text>
                    <text
                      x={cx}
                      y={cy + 14}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-[10px] font-medium uppercase tracking-luxe"
                    >
                      Products
                    </text>
                  </g>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}

/** Legend row — kept here so the dashboard can compose it next to the donut. */
export function InventoryLegend({
  data,
  className,
}: {
  data: InventoryDatum[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-2 text-sm", className)}>
      {data.map((d) => (
        <li key={d.key} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: d.color }}
            />
            {d.label}
          </span>
          <span className="font-medium tabular-nums text-foreground">
            {d.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

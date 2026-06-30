"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminKpi } from "@/types";

/**
 * KpiCard — a single metric tile for the dashboard.
 *
 * Premium feel:
 *  - Framer Motion subtle y-lift on hover (consistent with the storefront
 *    ProductCard pattern).
 *  - Delta is shown with a directional icon. Monochrome: positive uses
 *    `text-foreground`, negative uses `text-muted-foreground`. We avoid
 *    green/red to stay on-brand with the editorial palette.
 *  - The `motion.div` wrapper is intentional (not `Reveal`) because KPIs
 *    sit above the fold and should animate in immediately on mount.
 */
export function KpiCard({ kpi }: { kpi: AdminKpi }) {
  const TrendIcon =
    kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;

  const positive = kpi.delta > 0;
  const negative = kpi.delta < 0;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="group"
    >
      <div className="flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 transition-colors duration-300 hover:border-border">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
            {kpi.label}
          </span>
          <TrendIcon
            className={cn(
              "h-3.5 w-3.5",
              positive
                ? "text-foreground"
                : negative
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60",
            )}
          />
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {kpi.value}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium tabular-nums",
              positive
                ? "text-foreground"
                : negative
                  ? "text-muted-foreground"
                  : "text-muted-foreground",
            )}
          >
            {positive ? "+" : ""}
            {kpi.delta.toFixed(1)}%
          </span>
          <span className="text-muted-foreground/70">vs last period</span>
        </div>
      </div>
    </motion.div>
  );
}

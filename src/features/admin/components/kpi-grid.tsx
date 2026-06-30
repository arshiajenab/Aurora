"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { StaggerGroup, staggerItem } from "@/shared/components/reveal";
import { KpiCard } from "@/features/admin/components/kpi-card";
import type { AdminKpi } from "@/types";

/**
 * KpiGrid — client island that renders the dashboard KPI tiles with a
 * staggered entrance.
 *
 * Why a separate client component: the dashboard page is a server
 * component (it fetches data), but Framer Motion's `motion.*` components
 * can only be instantiated on the client. Lifting the motion wrappers
 * into this island keeps the data fetch server-side while the animation
 * stays client-side.
 */
export function KpiGrid({ kpis }: { kpis: AdminKpi[] }) {
  return (
    <StaggerGroup
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
      stagger={0.05}
    >
      {kpis.map((kpi) => (
        <motion.div key={kpi.label} variants={staggerItem}>
          <KpiCard kpi={kpi} />
        </motion.div>
      ))}
    </StaggerGroup>
  );
}

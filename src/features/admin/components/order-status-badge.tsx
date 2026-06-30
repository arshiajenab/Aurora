import * as React from "react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

/**
 * OrderStatusBadge — monochrome status pill.
 *
 * The admin palette is strictly monochrome (no green/blue/amber). We
 * encode state through foreground weight + opacity rather than hue:
 *  - pending        → muted bg, foreground text (awaiting action)
 *  - processing     → secondary, slightly stronger
 *  - shipped        → outline + dot (in-flight)
 *  - delivered      → solid foreground bg + background text (terminal)
 *  - cancelled      → destructive-tinted (the only non-neutral, reserved
 *                     for the failure state so it still reads as "wrong")
 *
 * The component is a server component (no client interactivity).
 */

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:
    "bg-muted text-muted-foreground border-transparent",
  processing:
    "bg-secondary text-secondary-foreground border-transparent",
  shipped:
    "bg-transparent text-foreground border-border",
  delivered:
    "bg-foreground text-background border-transparent",
  cancelled:
    "bg-destructive/10 text-destructive border-transparent dark:bg-destructive/20",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize tracking-tight",
        STATUS_STYLES[status],
        className,
      )}
    >
      {status === "shipped" && (
        <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

export const ORDER_STATUS_LIST: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

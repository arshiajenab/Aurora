import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Eyebrow — the small uppercase label that sits above premium section titles.
 * Uses letter-spacing + muted foreground for an editorial feel.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-medium uppercase tracking-luxe text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * SectionHeading — consistent section title block: eyebrow + title + optional
 * description + optional trailing action (e.g. "View all").
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          align === "center" && "items-center text-center",
        )}
      >
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

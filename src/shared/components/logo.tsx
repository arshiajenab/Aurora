"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Aurora wordmark — a minimal geometric mark + refined wordmark.
 * The mark is an SVG so it scales crisply and inherits currentColor.
 */
export function Logo({
  className,
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Aurora home"
      className={cn(
        "group inline-flex items-center gap-2.5 font-semibold tracking-tight",
        className,
      )}
    >
      <span className="relative inline-flex h-7 w-7 items-center justify-center">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="h-full w-full text-foreground transition-transform duration-500 ease-out group-hover:rotate-[120deg]"
          aria-hidden="true"
        >
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="currentColor"
            strokeWidth="1.5"
            className="opacity-30"
          />
          <path
            d="M16 4 L24 16 L16 28 L8 16 Z"
            fill="currentColor"
            className="opacity-90"
          />
          <circle cx="16" cy="16" r="2.5" className="fill-background" />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[1.05rem] tracking-tight">Aurora</span>
      )}
    </Link>
  );
}

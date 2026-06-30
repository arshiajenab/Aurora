"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * AdminTopbar — sticky glass bar that sits above the admin main area.
 *
 * Owns:
 *  - Mobile hamburger (opens the sidebar drawer via `onMenuClick`).
 *  - Page title / crumb derived from `usePathname`.
 *  - Theme toggle + a "View store" link back to the storefront.
 *
 * The topbar is sticky and uses the `.glass` utility for that frosted,
 * Apple/Linear feel. It is intentionally short (h-14) so the dashboard
 * content dominates. Per-page toolbars (search, sort, export) live inside
 * each page's header rather than here so they stay scoped to their route.
 */

function deriveTitle(pathname: string): { title: string; crumb: string } {
  if (pathname === "/admin") return { title: "Dashboard", crumb: "Overview" };
  if (pathname.startsWith("/admin/products"))
    return { title: "Products", crumb: "Catalog" };
  if (pathname.startsWith("/admin/orders"))
    return { title: "Orders", crumb: "Fulfilment" };
  return { title: "Admin", crumb: "Console" };
}

export function AdminTopbar({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const { title, crumb } = deriveTitle(pathname);

  return (
    <header
      className={cn(
        "glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 px-4 lg:px-6",
      )}
    >
      {/* Mobile menu trigger */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu className="h-[1.05rem] w-[1.05rem]" />
      </Button>

      {/* Title + crumb */}
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
          {title}
        </h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          · {crumb}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hidden gap-1.5 sm:inline-flex"
        >
          <Link href="/">
            View store
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </header>
  );
}


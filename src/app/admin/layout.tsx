import type { Metadata } from "next";
import * as React from "react";
import { AdminShell } from "@/features/admin/components/admin-shell";

/**
 * Admin layout — the app-shell for /admin/*.
 *
 * No SiteHeader / SiteFooter (the storefront chrome lives in the
 * `(shop)` route group). Instead we render the AdminShell client island
 * which composes the sidebar + topbar + scrollable main area.
 *
 * Metadata: noindex — admin must never be indexed.
 */
export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s — Aurora Admin",
  },
  description: "Aurora admin console — dashboard, products, orders.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}

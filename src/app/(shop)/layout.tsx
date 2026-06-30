import * as React from "react";
import { SiteHeader } from "@/shared/components/site-header";
import { SiteFooter } from "@/shared/components/site-footer";
import { CompareBar } from "@/features/compare/components/compare-bar";
import { CompareSync } from "@/features/compare/components/compare-sync";

// All storefront pages fetch from the database, so they must be rendered
// on-demand (not prerendered at build time, when no DB is available).
export const dynamic = "force-dynamic";

/**
 * Shop layout — shared chrome (header + footer) for every storefront page.
 * The root layout already provides the `min-h-screen flex flex-col` wrapper,
 * so here we just slot header/main/footer. `flex-1` on main pushes the
 * footer down naturally on short pages.
 *
 * The CompareBar is `fixed bottom-center` so it floats above content
 * without affecting layout flow. CompareSync is a no-UI island that
 * mirrors the local compare store to the backend when authed.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CompareBar />
      <CompareSync />
    </>
  );
}

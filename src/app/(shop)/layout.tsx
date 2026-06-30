import * as React from "react";
import { SiteHeader } from "@/shared/components/site-header";
import { SiteFooter } from "@/shared/components/site-footer";

/**
 * Shop layout — shared chrome (header + footer) for every storefront page.
 * The root layout already provides the `min-h-screen flex flex-col` wrapper,
 * so here we just slot header/main/footer. `flex-1` on main pushes the
 * footer down naturally on short pages.
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
    </>
  );
}

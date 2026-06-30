import type { Metadata } from "next";
import { CompareView } from "@/features/compare/components/compare-view";

/**
 * /compare — thin server shell around the client CompareView.
 *
 * The compare list lives in the persisted client store (localStorage), so
 * the server can't render it directly. We render the client island and let
 * it hydrate from the store + fetch full product data. Metadata is static
 * (no index — the page is user-specific).
 */
export const metadata: Metadata = {
  title: "Compare",
  description:
    "Compare up to four Aurora products side by side — price, specifications, dimensions, warranty, shipping and more.",
  robots: { index: false, follow: false },
};

export default function ComparePage() {
  return <CompareView />;
}

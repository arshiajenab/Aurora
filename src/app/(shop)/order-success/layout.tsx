import type { Metadata } from "next";

/**
 * Order success route metadata — noindex. The page itself is a Client
 * Component (uses useSearchParams for the order id), so the metadata lives
 * here in the layout.
 */
export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your Aurora order has been placed.",
  robots: { index: false, follow: false },
};

export default function OrderSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

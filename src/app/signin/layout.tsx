import type { Metadata } from "next";

/**
 * Sign-in route metadata — noindex (auth page must never be indexed).
 * The page itself is a Client Component (uses useAuth + router), so the
 * metadata lives here in the layout.
 */
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Aurora account.",
  robots: { index: false, follow: false },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

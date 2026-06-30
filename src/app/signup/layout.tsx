import type { Metadata } from "next";

/**
 * Sign-up route metadata — noindex.
 */
export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Aurora account.",
  robots: { index: false, follow: false },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

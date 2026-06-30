import type { Metadata } from "next";
import * as React from "react";
import { getSessionOrRefresh } from "@/lib/session";
import { usersService, type PublicUser } from "@/services/users.service";
import { AccountShell } from "@/features/account/components/account-shell";

/**
 * Account layout — the chrome for /account/*.
 *
 * Strategy:
 *  - Server component resolves the session (refreshing if needed) and reads
 *    the PublicUser so we can render the avatar + name in the sidebar
 *    immediately (no client-side flash on first paint).
 *  - The client AccountShell also reads useAuth() for double-guard: if a
 *    client-side sign-out happens (or the session somehow expired), the
 *    shell redirects to /signin. Middleware already protects the route, so
 *    this is defensive.
 *
 * Metadata: noindex — account pages are private.
 */
export const metadata: Metadata = {
  title: {
    default: "Account",
    template: "%s — Aurora Account",
  },
  description: "Manage your Aurora account, orders, and saved items.",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionOrRefresh();
  let user: PublicUser | null = null;
  if (session) {
    try {
      user = await usersService.getById(session.id);
    } catch {
      user = null;
    }
  }

  return <AccountShell user={user}>{children}</AccountShell>;
}

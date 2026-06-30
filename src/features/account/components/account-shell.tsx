"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Settings,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Logo } from "@/shared/components/logo";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "sonner";
import type { PublicUser } from "@/services/users.service";

/**
 * AccountShell — client chrome for the /account area.
 *
 * Mirrors the admin shell pattern: a fixed left sidebar on desktop, a Sheet
 * drawer on mobile, a sticky top bar with avatar + theme toggle, and a
 * scrollable main area.
 *
 * Auth guard: middleware already protects `/account/*`, but we double-guard
 * here using `useAuth()` so client-side navigation (e.g. from the storefront
 * after sign-out) doesn't leave the user on a broken page.
 */

const NAV_ITEMS = [
  { label: "Dashboard", href: "/account", icon: LayoutDashboard },
  { label: "Orders", href: "/account/orders", icon: Package },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "Profile", href: "/account/profile", icon: User },
  { label: "Settings", href: "/account/settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(user: PublicUser | null): string {
  if (!user) return "··";
  const name = user.name ?? user.email;
  return name.slice(0, 2).toUpperCase();
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Account navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-[1.05rem] w-[1.05rem]",
                active
                  ? "text-background"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            <span className="tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarHeader({ user }: { user: PublicUser | null }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1">
      <Avatar className="h-9 w-9">
        <AvatarImage src={user?.avatar ?? undefined} alt={user?.name ?? ""} />
        <AvatarFallback className="text-xs">
          {initials(user)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium tracking-tight">
          {user?.name ?? "Account"}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {user?.email}
        </span>
      </div>
    </div>
  );
}

export function AccountShell({
  user,
  children,
}: {
  user: PublicUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: clientUser, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Double-guard: if auth loading finished and there's no user, bounce to /signin.
  React.useEffect(() => {
    if (!loading && !clientUser) {
      router.replace(`/signin?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [loading, clientUser, router, pathname]);

  // Prefer the freshest user object (client-side) — falls back to the server-passed user.
  const displayUser = clientUser ?? user;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/");
  };

  // While auth is loading and we don't have a server-side user either, render a
  // minimal skeleton. This avoids a flash of unauthenticated UI on first load.
  if (!displayUser && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border bg-sidebar lg:flex">
        <div className="flex flex-col gap-6 px-4 py-6">
          <div className="px-3">
            <Logo href="/account" />
            <p className="mt-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
              Account
            </p>
          </div>
          <SidebarNav pathname={pathname} />
          <SidebarHeader user={displayUser} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-4">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/">
              View store
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Sign out"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 border-r border-border bg-sidebar p-0">
          <SheetHeader className="flex flex-row items-center justify-between gap-2 px-4 py-5">
            <SheetTitle asChild>
              <span>
                <Logo href="/account" />
              </span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
            <p className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
              Account
            </p>
            <SidebarNav
              pathname={pathname}
              onNavigate={() => setSidebarOpen(false)}
            />
            <SidebarHeader user={displayUser} />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full gap-1.5 rounded-full"
            >
              <Link href="/">
                <ArrowUpRight className="h-3.5 w-3.5" />
                View store
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 rounded-full text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 px-4 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-[1.05rem] w-[1.05rem]" />
          </Button>
          <Logo href="/account" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Account menu"
            >
              <Link href="/account/profile">
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={displayUser?.avatar ?? undefined}
                    alt={displayUser?.name ?? ""}
                  />
                  <AvatarFallback className="text-[10px]">
                    {initials(displayUser)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

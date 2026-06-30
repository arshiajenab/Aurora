"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/shared/components/logo";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * AdminSidebar — the navigation chrome for the admin shell.
 *
 * Two surfaces, one component:
 *  - Desktop: a fixed left rail (`hidden lg:flex`) with nav + logo + theme toggle.
 *  - Mobile: a `Sheet` (slide-in drawer) driven by `open`/`onOpenChange`
 *    so the topbar can trigger it.
 *
 * Active link highlighting uses `usePathname` with a trailing-segment match
 * so nested routes (e.g. `/admin/products/123`) still light up "Products".
 */

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin/customers", icon: Users },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin navigation">
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
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-[1.05rem] w-[1.05rem] transition-transform",
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

function SidebarBranding() {
  return (
    <div className="px-3">
      <Logo href="/admin" />
      <p className="mt-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
        Admin Console
      </p>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-4">
      <Link
        href="/"
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        View storefront →
      </Link>
      <ThemeToggle />
    </div>
  );
}

/** Mobile drawer (rendered server-side as null until opened client-side). */
export function AdminSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border bg-sidebar lg:flex">
        <div className="flex flex-col gap-8 px-4 py-6">
          <SidebarBranding />
          <SidebarNav pathname={pathname} />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-72 border-r border-border bg-sidebar p-0"
        >
          <SheetHeader className="flex flex-row items-center justify-between gap-2 px-4 py-5">
            <SheetTitle asChild>
              <span>
                <Logo href="/admin" />
              </span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
            <p className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
              Admin Console
            </p>
            <SidebarNav
              pathname={pathname}
              onNavigate={() => onOpenChange(false)}
            />
          </div>
          <SidebarFooter />
        </SheetContent>
      </Sheet>
    </>
  );
}

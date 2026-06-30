"use client";

import * as React from "react";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AdminTopbar } from "@/features/admin/components/admin-topbar";

/**
 * AdminShell — the client island that owns the mobile drawer open-state
 * and stitches the sidebar + topbar + main content together.
 *
 * The server layout (`src/app/admin/layout.tsx`) renders this shell and
 * passes the page children through. Keeping the state here means the
 * topbar's hamburger button can open the sidebar drawer without lifting
 * state to the server component (which can't hold it).
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

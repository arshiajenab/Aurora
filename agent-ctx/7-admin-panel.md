# Task 7 — Admin Panel

Agent: Admin Panel Engineer
Scope: `src/app/admin/**` + `src/features/admin/components/**`
Status: COMPLETE — all routes 200, lint clean, no runtime errors.

## Files created (18)
Server components:
- `src/app/admin/layout.tsx` — app shell (AdminShell) + noindex metadata
- `src/app/admin/page.tsx` — dashboard (KPIs + revenue chart + recent orders + inventory + orders-by-status)
- `src/app/admin/loading.tsx` — dashboard skeleton
- `src/app/admin/products/page.tsx` — products table (server, reads searchParams)
- `src/app/admin/products/loading.tsx`
- `src/app/admin/orders/page.tsx` — orders page (server, fetches + summary stats)
- `src/app/admin/orders/loading.tsx`

Client components (`src/features/admin/components/`):
- `admin-shell.tsx` — owns sidebar drawer state, composes sidebar+topbar+main
- `admin-sidebar.tsx` — desktop rail + mobile Sheet, active-link highlighting via usePathname
- `admin-topbar.tsx` — sticky glass topbar, mobile hamburger, page title/crumb, theme toggle, View store link
- `kpi-card.tsx` — single KPI tile, Framer hover lift, monochrome delta
- `kpi-grid.tsx` — StaggerGroup + motion.div island (server can't render motion.*)
- `revenue-chart.tsx` — Recharts AreaChart via shadcn ChartContainer, chart-1 gradient
- `inventory-chart.tsx` — Recharts PieChart donut + InventoryLegend export
- `order-status-badge.tsx` — monochrome status pill (5 variants) + ORDER_STATUS_LIST
- `stock-indicator.tsx` — StockIndicator (dot) + StockBadge for product tables
- `products-toolbar.tsx` — debounced ?q= search + ?sortBy= select + Export (mock toast)
- `orders-table.tsx` — status filter tabs (All/Pending/Processing/Shipped/Delivered/Cancelled) + search + table

## Shared config change (additive, non-breaking)
- `next.config.ts` — added `images.remotePatterns` for `cdn.dummyjson.com` + `dummyjson.com`. This unblocks `next/image` for ALL product thumbnails across the entire app (storefront included). The dev server auto-restarted to pick this up.

## Design language honored
- Strictly monochrome — NO indigo/blue/purple. Only non-neutral is `destructive` (used for out-of-stock and cancelled, the failure states).
- Tokens used: `bg-background`, `bg-card`, `bg-sidebar`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `--chart-1..3`.
- Cards: `rounded-2xl border bg-card`, `p-5`/`p-6`, hairline borders.
- Table headers: `text-[11px] uppercase tracking-luxe text-muted-foreground`.
- `.glass` on the sticky topbar.
- Recharts: minimal axis lines, hairline dashed grid, custom tooltip via `ChartTooltipContent`, gradient fill using `--chart-1`.

## Data flow
- Server components call `adminService` / `productService` directly (no API round-trip).
- Charts are client islands that receive already-fetched data as props.
- Products page reads `searchParams` (`page`, `sortBy`, `q`) and re-fetches server-side.
- Orders page fetches 8 orders server-side; client `OrdersTable` filters/searches in-memory.

## Verification
- `bun run lint`: 0 errors, 0 warnings in admin files (2 unrelated warnings in Task-6 storefront files).
- `curl /admin /admin/products /admin/orders` → all 200.
- `curl /admin/products?q=phone&page=1` → 200.
- `curl /admin/products?sortBy=price-asc` → 200.
- dev.log: no compile errors, no hydration warnings, no runtime errors after the motion.* fix.

## Gotcha fixed mid-build
Framer Motion's `motion.div` cannot be instantiated in a Server Component (`createMotionComponent` is client-only). The dashboard initially rendered `<motion.div>` inside the server page → runtime error. Fixed by extracting the KPI grid into a `KpiGrid` client island that receives `kpis: AdminKpi[]` as a prop. Pattern to remember for any future server page that needs motion: push the motion JSX into a client child, pass plain data.

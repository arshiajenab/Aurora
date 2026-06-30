# Aurora

A premium e-commerce platform built with Next.js 16, TypeScript, and Prisma.

## What this is

I wanted to build something that felt like a real product — not a tutorial. The goal was a minimalist, Apple/Linear-inspired storefront with a working admin panel, JWT auth, and real database persistence.

## Stack

- **Next.js 16** (App Router, Server Components, Route Handlers)
- **TypeScript** (strict mode)
- **Prisma + SQLite** (dev) / PostgreSQL (prod)
- **Tailwind CSS 4 + shadcn/ui**
- **Zustand** (cart/wishlist/compare state, persisted)
- **TanStack Query** (server state)
- **React Hook Form + Zod** (forms + validation)
- **Framer Motion** (animations)

## Features

### Storefront
- Landing page with featured products and categories
- Product catalog with filtering, sorting, search, and pagination
- Product detail pages with image gallery, related products, recently viewed
- Shopping cart with persistence and free-shipping progress
- Wishlist (synced to backend for logged-in users)
- Product comparison (up to 4 products, floating bar + dedicated page)
- Checkout with shipping/billing addresses, coupon codes, shipping/payment methods
- Order confirmation page

### Authentication
- JWT access tokens (15min) + rotating refresh tokens (DB-backed)
- Signup / signin with password hashing (bcrypt)
- Auto-login on page load
- Protected routes: only `/checkout` and `/account/*` require auth
- Admin panel is intentionally open (no auth)

### User Dashboard
- Dashboard with order/wishlist/address stats
- Profile editing with avatar upload
- Order history with status timeline, reorder, cancel
- Wishlist management (move to cart, remove)
- Saved addresses (CRUD, set default)
- Account settings (change password, delete account)

### Admin Dashboard
- Analytics: revenue chart, KPI cards, inventory health, latest products
- Product management: full CRUD with image uploads
- Order management: search, filter by status, detail dialog, status updates
- Customer list with order history and total spent

## Getting started

```bash
npm install
npm run dev
```

The database auto-seeds on first run (pulls products from DummyJSON). On subsequent runs it skips instantly.

## Architecture

```
src/
  features/          # Feature-based modules (products, cart, auth, admin, etc.)
    products/
      components/    # ProductCard, ProductGallery, ProductFilters
      hooks/
    cart/
      components/    # CartSheet
      store/         # Zustand store
    auth/
      hooks/         # useAuth context
    admin/
      components/    # Admin tables, dialogs, charts
  services/          # Data layer (single seam to DB/API)
  shared/            # Cross-cutting components, providers, hooks
  lib/               # Utilities, constants, validations, JWT, session
  types/             # Domain types
  app/               # Next.js App Router pages + API routes
```

## Notes

- The product catalog is seeded from [DummyJSON](https://dummyjson.com) (free public API). The service layer is isolated so you can swap to a real backend by editing one file.
- Demo coupons: `WELCOME10` (10% off), `AURORA20` (20% off over $200), `FREESHIP` (free shipping).
- Image uploads go to `public/uploads/` in dev. For production, swap to Vercel Blob or Cloudinary (one file to change).

## Deploying

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel setup instructions.

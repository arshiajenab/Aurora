# Task C — Product Compare Feature

## Agent
Compare Feature Engineer

## Task
Build the full compare experience for Aurora: compare page, floating compare bar, compare toggles on ProductCard and ProductActions, and verification of guest→auth DB sync.

## Work Log
- Read worklog (especially Task 11). Confirmed backend DONE: compare API + `compareService` + `compare-store` + `use-auth.tsx` guest→auth sync + `CompareSync` ongoing PUT all exist.
- All 5 task items were already scaffolded by Task 11. I verified each, then applied targeted refinements to align with the explicit spec:
  - `compare-view.tsx`: switched EmptyState icon from `GitCompare` → `Scale` (matches spec + the icon used on ProductCard/ProductActions for consistency); changed alternate-row background from `bg-muted/50` → `bg-muted/40` per spec.
  - `compare-bar.tsx`: shrunk thumbnails from `h-9 w-9` (36px) → `h-8 w-8` (32px) per spec; switched the "Clear" button icon from `Trash2` → `X` per spec ("Clear" X); removed the now-unused `Trash2` import; aligned `sizes="36px"` → `sizes="32px"` on `next/image`; aligned empty-slot dashed circles to `h-8 w-8`.
  - `ProductCard` (`product-card.tsx`) — verified already-compliant: Scale icon, top-right placement next to Heart, fills when active, disables + tooltip "Compare list full" when at MAX_COMPARE and not in list, toast on toggle. No edits required.
  - `ProductActions` (`product-actions.tsx`) — verified already-compliant: outline "Compare" button (Scale icon) next to Add to bag + Wishlist, fills when active, disables when full (title="Compare list full"), toast on toggle. No edits required.
  - DB sync — verified in `use-auth.tsx` (lines 52-109): on guest→auth transition (prevUserId !== user.id), reads `aurora-wishlist` + `aurora-compare` from localStorage, parses IDs, PUTs to `/api/wishlist` and `/api/compare`, then GETs both and rehydrates localStorage. `compare-sync.tsx` handles the ongoing PUT on `ids` change when authed (skip-first-emit pattern so it doesn't duplicate the auth transition's PUT). No edits required.

## Stage Summary
- `npx tsc --noEmit` → 0 errors.
- `bun run lint` → 0 errors, 0 warnings in my code (1 pre-existing warning in `src/app/signup/page.tsx` from React Hook Form + React Compiler — not from this task).
- `curl /compare` → 200. `curl /api/compare` → 401 (correct — user-scoped, requires auth).
- `/home/z/my-project/dev.log` — `GET /compare 200 in 404ms` confirmed; no compile errors, no hydration warnings.
- All 5 spec items satisfied; minimal-touch refinements only (no rewrite of working code).
- Files modified: 2 (`compare-view.tsx`, `compare-bar.tsx`). Files verified unchanged: 5 (`compare/page.tsx`, `compare/loading.tsx`, `compare/store/compare-store.ts`, `compare/components/compare-sync.tsx`, `(shop)/layout.tsx`, `product-card.tsx`, `product-actions.tsx`, `use-auth.tsx`).
- Design language preserved: monochrome only, hairline borders, rounded-2xl/rounded-full, tracking-luxe eyebrows, Framer Motion micro-interactions, `useMounted` gate on every persisted-store read.

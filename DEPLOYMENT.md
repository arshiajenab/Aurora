# Deploying Aurora to Vercel

This guide walks you through deploying the Aurora e-commerce platform to
Vercel with a hosted PostgreSQL database.

---

## Why SQLite doesn't work on Vercel

SQLite writes to a local file (`db/custom.db`). Vercel's serverless
functions have an **ephemeral filesystem** — files don't persist between
invocations, and each request may run on a different container. You need
a **hosted database** that persists data externally.

The good news: the Prisma schema is already PostgreSQL-compatible. You
just switch the `provider` and the `DATABASE_URL`.

---

## Step 1 — Create a hosted PostgreSQL database (free)

### Option A: Neon (recommended — fastest setup)

1. Go to [neon.tech](https://neon.tech) → Sign up with GitHub
2. Click **New Project** → name it `aurora` → pick a region close to
   Vercel's (Washington D.C. = `iad1` if you're in the US)
3. Copy the **connection string** from the dashboard. It looks like:
   ```
   postgresql://neondb_owner:npg_secret_123@ep-aurora-abc123.us-east-2.aws.neon.tech/aurora?sslmode=require
   ```

### Option B: Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. After creation: Settings → Database → Connection string → **URI**
3. Copy the connection string (it looks similar to Neon's)

---

## Step 2 — Switch the Prisma provider to PostgreSQL

Open `prisma/schema.prisma` and change the datasource:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

That's the only schema change needed — arrays are already stored as JSON
strings, and there are no SQLite-specific types.

---

## Step 3 — Push to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "prep for vercel deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aurora.git
git push -u origin main
```

**Make sure `.env` is NOT committed** (it's in `.gitignore`).

---

## Step 4 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → Project
2. Import your `aurora` GitHub repo
3. Vercel auto-detects Next.js — don't change the framework preset
4. **Environment Variables** — add these (Project Settings → Environment Variables):

   | Name | Value | Environments |
   |------|-------|--------------|
   | `DATABASE_URL` | `postgresql://...your-neon-string...` | Production, Preview, Development |
   | `JWT_ACCESS_SECRET` | (run `openssl rand -base64 32` locally, paste output) | Production, Preview |
   | `JWT_REFRESH_SECRET` | (run `openssl rand -base64 32` again, paste output) | Production, Preview |

5. Click **Deploy**

The build runs `vercel-build` → `prisma generate && next build`. This
does **not** touch the database — it only generates the Prisma Client
code and compiles Next.js. The build will succeed in ~2 minutes.

---

## Step 5 — Create the database tables + seed data

After the first successful deploy, the site will load but show empty
product lists (the DB exists but has no tables/data yet). Run these
commands **once** from your local machine to create the schema and seed
the catalog:

```bash
# Pull the production env vars into a local file (so your local Prisma
# CLI can talk to the production Neon DB)
npm i -g vercel
vercel login
vercel link            # link this folder to your Vercel project
vercel env pull .env.production.local   # writes .env.production.local

# Create all tables on the production DB
npx prisma db push

# Seed 194 products from DummyJSON
npx tsx scripts/seed.ts
```

Verify in the Neon dashboard that the `Product` table has 194 rows.

Your live Vercel site now shows the full catalog. 🎉

---

## Step 6 — Fix image uploads for production

The `/api/upload` route writes to `public/uploads/` — this works locally
but **doesn't persist on Vercel** (ephemeral filesystem). Uploaded
images disappear after the request ends. Switch to a cloud storage
provider.

### Easiest: Vercel Blob

1. In your Vercel project: Storage → Create → Blob
2. Copy the `BLOB_READ_WRITE_TOKEN`
3. Add it to env vars: `BLOB_READ_WRITE_TOKEN`
4. Install: `npm install @vercel/blob`
5. Replace the body of `src/app/api/upload/route.ts`:

```ts
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "avatars" ? "avatars" : "products";
  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const blob = await put(`${kind}/${crypto.randomUUID()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    urls.push(blob.url);
  }
  return NextResponse.json({ urls }, { status: 201 });
}
```

### Alternative: Cloudinary

Sign up at [cloudinary.com](https://cloudinary.com), install
`cloudinary`, and swap the upload logic. Same idea — return a hosted URL
instead of a local path.

---

## Troubleshooting

### Build hangs at `prisma db push`

You have an old `vercel-build` script that includes `prisma db push`.
Update `package.json` so `vercel-build` only does `prisma generate && next build`:

```json
"vercel-build": "prisma generate && next build"
```

### `PrismaClientInitializationError` at runtime

The `DATABASE_URL` env var isn't set on Vercel, or the connection string
is wrong. Check Vercel → Project → Settings → Environment Variables. Make
sure it's set for **Production** (and Preview if you use preview deploys).

### Site loads but products are empty

You ran `prisma db push` + seed locally but against the **local** SQLite
DB, not the production Postgres. Re-run with `vercel env pull` first
(Step 5 above) so your local CLI targets the production database.

### Hydration errors / weird crashes

Make sure `output: "standalone"` is **removed** from `next.config.ts` —
Vercel manages the runtime, and `standalone` output conflicts with its
build pipeline.

### `@prisma/client did not initialize yet`

The `postinstall` hook (`prisma generate`) didn't run. This happens if
you skipped `npm install` or the hook failed. Run `npx prisma generate`
manually after install.

---

## Quick reference

| Where | What |
|-------|------|
| Local dev | SQLite (`db/custom.db`), auto-seeds on boot |
| Vercel build | `prisma generate && next build` (no DB access) |
| Vercel runtime | Connects to Neon Postgres via `DATABASE_URL` env var |
| Seed | Run once locally after `vercel env pull` |
| Image uploads | Swap to Vercel Blob or Cloudinary (see Step 6) |

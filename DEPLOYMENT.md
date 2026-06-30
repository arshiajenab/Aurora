# Deploying Aurora to Vercel (MongoDB)

This guide walks you through deploying the Aurora e-commerce platform to
Vercel with a hosted MongoDB database (MongoDB Atlas — free tier).

MongoDB is actually **easier** to deploy than SQLite/PostgreSQL because
MongoDB Atlas is a fully managed cloud database that connects via a
standard connection string — no filesystem, no connection pooling issues.

---

## Step 1 — Create a free MongoDB Atlas database

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → **Try Free**
2. Create a free **M0** cluster (512 MB — plenty for this project)
3. Pick a region close to Vercel's (Washington D.C. = `iad1` if you're in the US)
4. Under **Database Access**: create a user (e.g. `aurora` / a strong password)
5. Under **Network Access**: click **Allow access from anywhere** (`0.0.0.0/0`)
   - (For production, restrict this to Vercel's IPs, but `0.0.0.0/0` is fine for a portfolio project)
6. Click **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://aurora:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
7. Replace `<password>` with your actual password, and add `/aurora` before the `?`:
   ```
   mongodb+srv://aurora:mypassword@cluster0.xxxxx.mongodb.net/aurora?retryWrites=true&w=majority&appName=Cluster0
   ```

---

## Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "init: aurora e-commerce with MongoDB"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aurora.git
git push -u origin main
```

**Make sure `.env` is NOT committed** (it's in `.gitignore`).

---

## Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → Project
2. Import your `aurora` GitHub repo
3. Vercel auto-detects Next.js — don't change the framework preset
4. **Environment Variables** — add these:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `DATABASE_URL` | `mongodb+srv://aurora:...@cluster0.xxxxx.mongodb.net/aurora?...` | Production, Preview, Development |
   | `JWT_ACCESS_SECRET` | run `openssl rand -base64 32` locally, paste output | Production, Preview |
   | `JWT_REFRESH_SECRET` | run `openssl rand -base64 32` again, paste output | Production, Preview |

5. Click **Deploy**

The build runs `vercel-build` → `prisma generate && next build`. This
does **not** touch the database — it only generates the Prisma Client
and compiles Next.js. Build succeeds in ~2 minutes.

---

## Step 4 — Create collections + seed data (one time)

After the first deploy, the site loads but shows empty product lists
(the DB exists but has no data yet). Run these commands **once** from
your local machine to create the schema and seed the catalog:

```bash
# Install Vercel CLI and link your project
npm i -g vercel
vercel login
vercel link

# Pull production env vars locally (so your local Prisma CLI can talk
# to the production MongoDB Atlas cluster)
vercel env pull .env.production.local

# Create all collections + indexes on MongoDB Atlas
npx prisma db push

# Seed 194 products from DummyJSON
npx tsx scripts/seed.ts
```

Verify in the MongoDB Atlas dashboard that the `Product` collection has
194 documents.

Your live Vercel site now shows the full catalog. 🎉

---

## Step 5 — Fix image uploads for production

The `/api/upload` route writes to `public/uploads/` — this works locally
but **doesn't persist on Vercel** (ephemeral filesystem). Switch to a
cloud storage provider.

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

---

## Local development with MongoDB

You have two options for local dev:

### Option A: MongoDB Atlas (same as production)
Just set `DATABASE_URL` in your `.env` to your Atlas connection string. Your
local dev and production share the same DB (fine for a solo project).

### Option B: Local MongoDB
1. Install MongoDB Community Edition: [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Start it: `mongod` (or run as a service)
3. Your `.env` already has: `DATABASE_URL="mongodb://localhost:27017/aurora"`
4. `npm run dev` — the `predev` script runs `prisma db push` + seed automatically

---

## Troubleshooting

### Build fails with `Prisma schema validation`
Make sure `prisma/schema.prisma` has `provider = "mongodb"` (not `sqlite`).
Then run `npx prisma generate` to regenerate the client.

### `PrismaClientInitializationError` at runtime
The `DATABASE_URL` env var isn't set on Vercel, or the Atlas connection
string is wrong. Check: Vercel → Project → Settings → Environment Variables.
Make sure the password in the URL is URL-encoded if it contains special chars.

### Site loads but products are empty
You ran the seed against a local DB, not Atlas. Re-run with `vercel env pull`
first (Step 4) so your local CLI targets the production MongoDB.

### `MongoServerError: authentication failed`
The username/password in your connection string doesn't match the Database
Access user you created in Atlas. Double-check the password — if it has
special characters, URL-encode them (e.g. `@` → `%40`).

### MongoDB Atlas `0.0.0.0/0` security warning
For a portfolio project this is fine. For production, restrict to Vercel's
IP ranges (they publish these in their docs) or use Vercel's integration
with MongoDB Atlas which handles networking automatically.

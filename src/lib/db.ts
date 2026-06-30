import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Self-healing: kick off a background seed check the moment the DB client is
 * created. If the catalog is empty (fresh clone / wiped DB), this pulls
 * products from DummyJSON automatically so the site is never blank.
 *
 * The check is a single `COUNT(*)` and returns instantly if products exist.
 * We don't `await` here — routes render with whatever's in the DB and the
 * seed completes in the background; a refresh shows the full catalog.
 */
if (process.env.NODE_ENV !== "production") {
  // Lazy import to avoid pulling fetch logic into the client bundle.
  void import("./auto-seed").then(({ ensureSeeded }) => ensureSeeded());
}

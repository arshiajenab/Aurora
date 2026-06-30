/**
 * Edge-safe auth constants. Kept separate from `session.ts` (which pulls
 * Prisma + next/headers) so middleware can import just these.
 */
export const ACCESS_COOKIE = "aurora_access";
export const REFRESH_COOKIE = "aurora_refresh";

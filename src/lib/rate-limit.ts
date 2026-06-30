/**
 * In-memory sliding-window rate limiter.
 *
 * Adequate for a single-instance deployment. For multi-instance production
 * you'd back this with Redis — the interface here is designed so that swap
 * is a one-file change.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  /** Max requests in the window. */
  limit: number;
  /** Window size in ms. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Extract a stable client key from a Request. Falls back to a header. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Set standard rate-limit headers on a response. */
export function applyRateLimitHeaders(
  res: Response,
  result: RateLimitResult,
): void {
  res.headers.set("X-RateLimit-Remaining", String(result.remaining));
  res.headers.set(
    "X-RateLimit-Reset",
    String(Math.round(result.resetAt / 1000)),
  );
}

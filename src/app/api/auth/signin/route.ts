import { NextResponse } from "next/server";
import { authService, AuthServiceError } from "@/services/auth.service";
import { setSessionCookies } from "@/lib/session";
import { signInSchema } from "@/lib/validations";
import { rateLimit, getClientIp, applyRateLimitHeaders } from "@/lib/rate-limit";

/** POST /api/auth/signin */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`signin:${ip}`, { limit: 15, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    const res = NextResponse.json(
      { error: "Too many sign-in attempts. Try again later." },
      { status: 429 },
    );
    applyRateLimitHeaders(res, rl);
    return res;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const user = await authService.signIn(parsed.data);
    await setSessionCookies(user);
    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AuthServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

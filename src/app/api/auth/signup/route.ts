import { NextResponse } from "next/server";
import { authService, AuthServiceError } from "@/services/auth.service";
import { setSessionCookies } from "@/lib/session";
import { signUpSchema } from "@/lib/validations";
import { rateLimit, getClientIp, applyRateLimitHeaders } from "@/lib/rate-limit";

/** POST /api/auth/signup */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`signup:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    const res = NextResponse.json(
      { error: "Too many sign-up attempts. Try again later." },
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
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const user = await authService.signUp(parsed.data);
    await setSessionCookies(user);
    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

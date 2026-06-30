import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { usersService, UsersServiceError } from "@/services/users.service";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validations";

/** GET /api/users/me */
export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const user = await usersService.getById(session.user.id);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof UsersServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/users/me — update profile (name/phone/avatar). */
export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const user = await usersService.updateProfile(session.user.id, parsed.data);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof UsersServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PUT /api/users/me/password — change password. */
export async function PUT(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    await usersService.changePassword(session.user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UsersServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/users/me — delete account (requires password in body). */
export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* allow empty body */
  }
  if (!body.password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }
  try {
    await usersService.deleteAccount(session.user.id, body.password);
    // Cookie clearing is handled by the client calling /api/auth/logout.
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UsersServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

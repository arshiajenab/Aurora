import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { compareService, MAX_COMPARE } from "@/services/compare.service";

/** GET /api/compare — current user's persisted compare ids. */
export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const ids = await compareService.listIds(session.user.id);
  return NextResponse.json({ ids, max: MAX_COMPARE });
}

/** PUT /api/compare — replace the persisted compare list. */
export async function PUT(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  let body: { ids?: number[] } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.ids)) {
    return NextResponse.json({ error: "`ids` must be an array" }, { status: 422 });
  }
  try {
    await compareService.replace(session.user.id, body.ids);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 400 },
    );
  }
}

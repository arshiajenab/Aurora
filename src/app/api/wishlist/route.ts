import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { wishlistService } from "@/services/wishlist.service";

/** GET /api/wishlist — current user's persisted wishlist product ids. */
export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const ids = await wishlistService.listIds(session.user.id);
  return NextResponse.json({ ids });
}

/** PUT /api/wishlist — replace the persisted wishlist with the given ids. */
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
  await wishlistService.replace(session.user.id, body.ids);
  return NextResponse.json({ ok: true });
}

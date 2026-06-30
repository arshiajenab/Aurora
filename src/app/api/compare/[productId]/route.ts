import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { compareService } from "@/services/compare.service";

/** POST /api/compare/[productId] — add to compare. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { productId: idStr } = await params;
  const productId = Number(idStr);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  try {
    await compareService.add(session.user.id, productId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 400 },
    );
  }
}

/** DELETE /api/compare/[productId] — remove from compare. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { productId: idStr } = await params;
  const productId = Number(idStr);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  await compareService.remove(session.user.id, productId);
  return new NextResponse(null, { status: 204 });
}

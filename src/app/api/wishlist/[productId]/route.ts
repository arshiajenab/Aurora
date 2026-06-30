import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { wishlistService } from "@/services/wishlist.service";
import { z } from "zod";

const bodySchema = z.object({ productId: z.number().int() });

/** POST /api/wishlist/[productId] — add product to wishlist. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { productId: idStr } = await params;
  const productId = Number(idStr);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  // Body is optional but kept for schema symmetry.
  void bodySchema;
  await wishlistService.add(session.user.id, productId);
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/wishlist/[productId] — remove product from wishlist. */
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
  await wishlistService.remove(session.user.id, productId);
  return new NextResponse(null, { status: 204 });
}

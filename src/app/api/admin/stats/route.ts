import { NextResponse } from "next/server";
import { adminService } from "@/services/admin.service";

/** GET /api/admin/stats — real dashboard aggregates. */
export async function GET() {
  try {
    const [kpis, revenue, recentOrders, inventory, latestProducts] =
      await Promise.all([
        adminService.getKpis(),
        adminService.getRevenueSeries(),
        adminService.getRecentOrders(6),
        adminService.getInventory(),
        adminService.getLatestProducts(5),
      ]);
    return NextResponse.json({
      kpis,
      revenue,
      recentOrders,
      inventory,
      latestProducts,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Ban,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCartStore } from "@/features/cart/store/cart-store";
import { formatCurrency } from "@/lib/format";
import type { OrderDto } from "@/types";
import type { Product } from "@/types";

/**
 * OrderActions — client island for the order detail page.
 *
 * Three actions:
 *   - Reorder: fetches each product via /api/products/[id], adds to the cart
 *     store, then navigates to /cart. Best-effort: unavailable products are
 *     reported in the toast.
 *   - Download invoice: opens a new window with a printable invoice (basic
 *     HTML + inline styles), then calls print().
 *   - Cancel order: AlertDialog confirm → PATCH /api/orders/[id]/status
 *     {status:"cancelled"} → toast + router.refresh().
 *
 * Cancel is only shown when status is pending or processing.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderAddress(addr: Record<string, unknown>): string {
  if (!addr || typeof addr !== "object") return "—";
  const get = (k: string) =>
    typeof addr[k] === "string" ? (addr[k] as string) : "";
  const lines = [
    get("fullName"),
    get("line1"),
    get("line2"),
    `${get("city")}${get("state") ? `, ${get("state")}` : ""} ${get("zip")}`.trim(),
    get("country"),
    get("phone"),
  ].filter(Boolean);
  return lines.map((l) => `<div>${escapeHtml(l)}</div>`).join("");
}

export function OrderActions({ order }: { order: OrderDto }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [reordering, setReordering] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  const canCancel = order.status === "pending" || order.status === "processing";

  const onReorder = async () => {
    setReordering(true);
    try {
      const results = await Promise.allSettled(
        order.items.map(async (it) => {
          const res = await fetch(`/api/products/${it.productId}`);
          if (!res.ok) throw new Error(`Product ${it.productId} unavailable`);
          const product = (await res.json()) as Product;
          addItem(product, it.quantity);
          return product.title;
        }),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      if (ok > 0) {
        toast.success(`Added ${ok} ${ok === 1 ? "item" : "items"} to bag`, {
          description:
            fail > 0
              ? `${fail} could not be added (no longer available).`
              : "Redirecting to your bag…",
        });
        router.push("/cart");
      } else {
        toast.error("Couldn't reorder", {
          description: "These products are no longer available.",
        });
      }
    } finally {
      setReordering(false);
    }
  };

  const onDownloadInvoice = () => {
    const win = window.open("", "_blank", "width=720,height=960");
    if (!win) {
      toast.error("Couldn't open invoice", {
        description: "Allow pop-ups for this site to download invoices.",
      });
      return;
    }
    const itemsRows = order.items
      .map(
        (it) => `
        <tr>
          <td class="title">${escapeHtml(it.title)} <span class="qty">×${it.quantity}</span></td>
          <td class="num">${formatCurrency(it.price)}</td>
          <td class="num">${formatCurrency(it.price * it.quantity)}</td>
        </tr>`,
      )
      .join("");

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice #${order.number} — Aurora</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0a0a0b; margin: 0; padding: 48px 56px; max-width: 720px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #e4e4e7; padding-bottom: 24px; margin-bottom: 32px; }
  h1 { font-size: 24px; margin: 0; letter-spacing: -0.02em; }
  .brand { font-size: 14px; color: #71717a; letter-spacing: 0.18em; text-transform: uppercase; }
  .meta { font-size: 13px; color: #71717a; line-height: 1.6; text-align: right; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; color: #71717a; margin: 24px 0 8px; }
  .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 8px 0 32px; font-size: 13px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-weight: 500; color: #71717a; padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td { padding: 10px 0; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
  td.title { font-weight: 500; }
  .qty { color: #71717a; font-weight: 400; margin-left: 4px; }
  .totals { margin-top: 24px; margin-left: auto; width: 280px; font-size: 13px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .row.total { border-top: 1px solid #e4e4e7; padding-top: 12px; margin-top: 8px; font-weight: 600; font-size: 16px; }
  .muted { color: #71717a; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa; text-align: center; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
  <header>
    <div>
      <div class="brand">Aurora</div>
      <h1>Invoice #${order.number}</h1>
    </div>
    <div class="meta">
      <div><strong>Status:</strong> ${escapeHtml(order.status)}</div>
      <div><strong>Issued:</strong> ${escapeHtml(formatDate(order.createdAt))}</div>
      <div><strong>Order ID:</strong> ${escapeHtml(order.id)}</div>
    </div>
  </header>

  <div class="addresses">
    <div>
      <h2>Ship to</h2>
      ${renderAddress(order.shippingAddress)}
    </div>
    <div>
      <h2>Bill to</h2>
      ${renderAddress(order.billingAddress)}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="num">Unit price</th>
        <th class="num">Line total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span class="muted">Subtotal</span><span class="num">${formatCurrency(order.subtotal)}</span></div>
    ${order.discount > 0 ? `<div class="row"><span class="muted">Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}</span><span class="num">−${formatCurrency(order.discount)}</span></div>` : ""}
    <div class="row"><span class="muted">Shipping</span><span class="num">${order.shipping === 0 ? "Free" : formatCurrency(order.shipping)}</span></div>
    <div class="row"><span class="muted">Tax</span><span class="num">${formatCurrency(order.tax)}</span></div>
    <div class="row total"><span>Total</span><span class="num">${formatCurrency(order.total)}</span></div>
  </div>

  <footer>
    Thank you for your order. This invoice was generated on ${escapeHtml(formatDate(new Date().toISOString()))}.
  </footer>

  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 250); };
  </script>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const onCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Couldn't cancel order");
      }
      toast.success("Order cancelled", {
        description: `Order #${order.number} has been cancelled.`,
      });
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't cancel order";
      toast.error("Couldn't cancel order", { description: message });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onReorder}
        disabled={reordering}
        className="gap-1.5 rounded-full"
      >
        {reordering ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Reordering…
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Reorder
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onDownloadInvoice}
        className="gap-1.5 rounded-full"
      >
        <Download className="h-4 w-4" />
        Download invoice
      </Button>

      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5 rounded-full text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <Ban className="h-4 w-4" />
              Cancel order
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel order #{order.number}. The items will be
                restocked. This action can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelling}>
                Keep order
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  onCancel();
                }}
                disabled={cancelling}
                className="gap-1.5 bg-destructive text-white hover:bg-destructive/90"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    Cancel order
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Button
        asChild
        variant="ghost"
        size="sm"
        className="ml-auto gap-1.5 rounded-full text-muted-foreground"
      >
        <a href="/account/orders">
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          All orders
        </a>
      </Button>
    </div>
  );
}

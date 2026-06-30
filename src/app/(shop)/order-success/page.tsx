"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, Mail, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/shared/components/section-heading";

/**
 * /order-success — confirmation page.
 *
 * Reads `orderId` from searchParams (set by /checkout after a successful POST).
 * The cart has already been cleared by the time we arrive here. Shows an
 * animated check, the order id, and CTAs.
 *
 * Note: we deliberately don't try to fetch the order (the mock API doesn't
 * persist); the order id is enough for a thank-you screen.
 */

function AnimatedCheck() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="relative flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-background"
    >
      <motion.span
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      >
        <Check className="h-9 w-9" strokeWidth={3} />
      </motion.span>
      {/* Soft pulsing ring */}
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full border-2 border-foreground/30"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
      />
    </motion.div>
  );
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
      <AnimatedCheck />

      <div className="mt-8 flex flex-col items-center gap-3">
        <Eyebrow>Confirmation</Eyebrow>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Thank you. Your order is in.
        </h1>
        <p className="max-w-md text-balance text-sm text-muted-foreground sm:text-base">
          A confirmation has been sent to your email. We&apos;ll let you know
          the moment your objects ship.
        </p>
      </div>

      {orderId && (
        <Card className="mt-8 w-full max-w-sm rounded-2xl border-border/60 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-luxe text-muted-foreground">
              Order number
            </span>
            <span className="font-mono text-lg font-semibold tracking-tight">
              {orderId}
            </span>
          </div>
        </Card>
      )}

      <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
        <Mail className="h-3.5 w-3.5" />
        Receipt sent to your inbox
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="gap-1.5 rounded-full px-6">
          <Link href="/products">
            <ShoppingBag className="h-4 w-4" />
            Continue shopping
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="gap-1.5 rounded-full px-6">
          <Link href="/">
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

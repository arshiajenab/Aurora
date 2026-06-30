"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE } from "@/lib/constants";
import { Logo } from "@/shared/components/logo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FOOTER_NAV: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/products" },
      { label: "New arrivals", href: "/products?sortBy=newest" },
      { label: "Categories", href: "/categories" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/products" },
      { label: "Craftsmanship", href: "/products" },
      { label: "Sustainability", href: "/products" },
      { label: "Press", href: "/products" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Shipping", href: "/products" },
      { label: "Returns", href: "/products" },
      { label: "Contact", href: "/products" },
      { label: "Admin", href: "/admin" },
    ],
  },
];

/**
 * Newsletter form — client-only. Uses optimistic local state + a fake
 * async submit. In production this would POST to /api/newsletter.
 */
function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "done">("idle");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 700));
    setStatus("done");
    toast.success("You're on the list", {
      description: "We'll be in touch with the occasional, considered note.",
    });
    setEmail("");
  };

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="h-3.5 w-3.5" />
        </span>
        Thank you — you&apos;re subscribed.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@domain.com"
        aria-label="Email address"
        className="h-10 rounded-full bg-background/60"
      />
      <Button
        type="submit"
        disabled={status === "loading"}
        className="h-10 shrink-0 gap-1.5 rounded-full"
      >
        {status === "loading" ? "Subscribing" : "Subscribe"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background">
      {/* Newsletter band */}
      <div className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex max-w-md flex-col gap-2">
            <h3 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
              Considered notes, occasionally.
            </h3>
            <p className="text-sm text-muted-foreground">
              New arrivals, restocks, and the occasional essay. No noise —
              unsubscribe in a click.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              {SITE.description}
            </p>
          </div>
          {FOOTER_NAV.map((section) => (
            <div key={section.title} className="flex flex-col gap-3">
              <h4 className="text-xs font-medium uppercase tracking-luxe text-muted-foreground">
                {section.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/products" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/products" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/products" className="transition-colors hover:text-foreground">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * FooterMarquee — a subtle, premium scrolling credo line. Purely decorative.
 */
export function FooterMarquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex overflow-hidden border-y border-border/60 py-4",
        className,
      )}
      aria-hidden="true"
    >
      <motion.div
        className="flex shrink-0 items-center gap-12 pr-12"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="text-sm uppercase tracking-luxe text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

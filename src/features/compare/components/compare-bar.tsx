"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { GitCompare, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useCompareStore,
  selectCompareCount,
  MAX_COMPARE,
} from "@/features/compare/store/compare-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import type { Product } from "@/types";

/**
 * CompareBar — global floating bar that surfaces the user's in-progress
 * compare list on every storefront page.
 *
 *  - Renders only when the store has at least 1 id (gated on `useMounted`
 *    so SSR never mismatches persisted state).
 *  - The "Compare now" CTA is enabled at >= 2 items (a 1-item compare is
 *    meaningless) — but the bar still appears at 1 so the user can see the
 *    list is building up.
 *  - Thumbnails are fetched lazily and cached in component state so the
 *    bar never re-fetches a product it already has.
 *  - Slides up from the bottom with Framer Motion; respects safe area on
 *    mobile via `pb-[env(safe-area-inset-bottom)]`.
 */
interface Thumb {
  id: number;
  title: string;
  thumbnail: string;
}

export function CompareBar() {
  const mounted = useMounted();
  const router = useRouter();
  const ids = useCompareStore((s) => s.ids);
  const count = useCompareStore(selectCompareCount);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const [thumbs, setThumbs] = React.useState<Record<number, Thumb>>({});

  // Track ids we've already attempted to fetch (success OR failure) so a
  // failed fetch doesn't trigger an infinite retry loop. Lives for the
  // session — the cache is small (≤ MAX_COMPARE entries per user).
  const fetchedRef = React.useRef<Set<number>>(new Set());

  // Fetch thumbnails for any ids we haven't attempted yet. Deps are just
  // [ids] so the effect only re-runs when the compare list changes — not
  // when the thumbs state object reference changes (which would loop).
  React.useEffect(() => {
    if (ids.length === 0) return;
    const missing = ids.filter((id) => !fetchedRef.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => fetchedRef.current.add(id));

    let cancelled = false;
    Promise.all(
      missing.map(async (id): Promise<[number, Thumb] | null> => {
        try {
          const res = await fetch(`/api/products/${id}`);
          if (!res.ok) return null;
          const p = (await res.json()) as Product;
          return [
            id,
            { id: p.id, title: p.title, thumbnail: p.thumbnail },
          ];
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setThumbs((prev) => {
        const next = { ...prev };
        for (const r of results) if (r) next[r[0]] = r[1];
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const visible = mounted && count >= 1;
  const canCompare = count >= 2;
  const slots = Math.max(0, MAX_COMPARE - ids.length);

  const handleRemove = (id: number) => {
    const t = thumbs[id];
    remove(id);
    toast.success("Removed from compare", {
      description: t?.title,
    });
  };

  const handleClear = () => {
    clear();
    toast.success("Compare list cleared");
  };

  const handleCompareNow = () => {
    if (!canCompare) return;
    router.push("/compare");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
          style={{
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="glass flex items-center gap-2 rounded-full border border-border/60 p-1.5 pl-3 shadow-lg sm:gap-3 sm:pl-4">
            {/* Icon + count */}
            <div className="flex items-center gap-1.5">
              <GitCompare className="h-4 w-4 text-foreground" />
              <span className="text-xs font-medium tabular-nums">
                {count}
                <span className="ml-0.5 text-muted-foreground">
                  /{MAX_COMPARE}
                </span>
              </span>
            </div>

            <div className="h-6 w-px bg-border/60" />

            {/* Thumbnails */}
            <div className="flex items-center gap-1.5">
              <AnimatePresence initial={false}>
                {ids.slice(0, MAX_COMPARE).map((id) => {
                  const t = thumbs[id];
                  return (
                    <motion.div
                      key={id}
                      layout
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted"
                    >
                      {t ? (
                        <Image
                          src={t.thumbnail}
                          alt={t.title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full skeleton-shimmer" />
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${t?.title ?? "item"} from compare`}
                        onClick={() => handleRemove(id)}
                        className="absolute right-0 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {Array.from({ length: slots }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  aria-hidden
                  className="hidden h-8 w-8 shrink-0 rounded-full border border-dashed border-border/60 sm:block"
                />
              ))}
            </div>

            {/* Compare now CTA */}
            <Button
              type="button"
              size="sm"
              onClick={handleCompareNow}
              disabled={!canCompare}
              className="gap-1.5 rounded-full"
            >
              Compare now
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            {/* Clear */}
            <button
              type="button"
              aria-label="Clear compare list"
              onClick={handleClear}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Hidden link for SEO / SR — keyboard users can also navigate */}
            <Link
              href="/compare"
              className="sr-only focus:not-sr-only focus:absolute focus:-top-12 focus:rounded-full focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
            >
              Go to compare page
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

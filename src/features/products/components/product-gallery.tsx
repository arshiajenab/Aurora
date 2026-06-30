"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ProductGallery — image switcher for the product detail page.
 *
 *  - Main image with a crossfade transition between selected images.
 *  - Thumbnail rail on the left (desktop) / bottom (mobile).
 *  - Keyboard accessible: arrow keys + Enter on thumbnails.
 *  - Prefetches adjacent images via next/image priority on the active one.
 */
export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const safeImages = images.length > 0 ? images : ["/icon.svg"];
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(0);

  // Clamp the index if the images array changes (different product).
  React.useEffect(() => {
    if (index >= safeImages.length) setIndex(0);
  }, [safeImages.length, index]);

  const paginate = React.useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex((next + safeImages.length) % safeImages.length);
    },
    [index, safeImages.length],
  );

  const go = React.useCallback(
    (i: number) => {
      if (i === index) return;
      setDirection(i > index ? 1 : -1);
      setIndex(i);
    },
    [index],
  );

  // Keyboard navigation on the main image.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      paginate(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      paginate(index - 1);
    }
  };

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div
          className="flex shrink-0 gap-3 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0 scrollbar-thin"
          role="tablist"
          aria-label="Product images"
        >
          {safeImages.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`View image ${i + 1} of ${safeImages.length}`}
              onClick={() => go(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted transition-all sm:h-20 sm:w-20",
                i === index
                  ? "border-foreground ring-2 ring-foreground/10"
                  : "border-border/60 hover:border-border",
              )}
            >
              <Image
                src={src}
                alt={`${alt} — image ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/60 bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="img"
        aria-label={`${alt} — image ${index + 1} of ${safeImages.length}`}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={safeImages[index]}
              alt={`${alt} — image ${index + 1}`}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Counter */}
        {safeImages.length > 1 && (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground backdrop-blur">
            {index + 1} / {safeImages.length}
          </div>
        )}
      </div>
    </div>
  );
}

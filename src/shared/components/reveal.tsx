"use client";

import * as React from "react";
import { motion, useInView, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/** Cubic-bezier ease used across reveal animations (expo-out feel). */
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Reveal — scroll-triggered fade/slide-in for sections and cards.
 *
 * Uses `useInView` with `once: true` so it only animates the first time,
 * keeping subsequent re-renders cheap and avoiding jank on back/forward.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: React.ElementType;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const MotionTag = motion[as as "div"] ?? motion.div;

  return (
    <MotionTag
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
      className={cn(className)}
    >
      {children}
    </MotionTag>
  );
}

/** Stagger container — pairs with `Reveal` children for sequenced reveals. */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

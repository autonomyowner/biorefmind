"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** One-shot fade-up on mount; `index` staggers siblings. */
export function FadeIn({
  children,
  className,
  index = 0,
  as = "div",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
  as?: "div" | "section" | "li";
  id?: string;
}) {
  const Tag = motion[as];
  return (
    <Tag
      id={id}
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.06, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/** A whole number that counts up once when it first comes into view. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const shown = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !seen) return;
    if (reduce) {
      el.textContent = value.toLocaleString("en-US");
      shown.current = value;
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = Math.round(v).toLocaleString("en-US");
      },
    });
    return () => controls.stop();
  }, [seen, value, reduce]);

  return (
    <span ref={ref} dir="ltr" className={className}>
      0
    </span>
  );
}

/** A grey placeholder block that pulses while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-2xl bg-white/60 ${className ?? ""}`} />;
}

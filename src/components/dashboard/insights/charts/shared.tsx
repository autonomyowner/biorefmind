"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Theme colours for SVG (the same values as the CSS tokens). */
export const COLORS = {
  azure: "#3f6cf2",
  violet: "#7b5cf0",
  navy: "#04173a",
  muted: "#4b5d79",
  grid: "rgba(7, 23, 51, 0.08)",
  up: "#12a26a",
  down: "#d64545",
} as const;

/** An id that is safe inside `url(#…)`. */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** The element's content width, kept up to date (0 until measured in the browser). */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** A number that counts from 0 when first seen, then glides to each new value; `format` prints it. */
export function CountTo({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const shown = useRef(0);
  const fmt = useRef(format);

  useEffect(() => {
    fmt.current = format;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !seen) return;
    if (reduce) {
      shown.current = value;
      el.textContent = fmt.current(value);
      return;
    }
    // While counting, show no more decimals than the final value has.
    const step = Number.isInteger(value) ? 1 : 0.01;
    const controls = animate(shown.current, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = fmt.current(v === value ? v : Math.round(v / step) * step);
      },
    });
    return () => controls.stop();
  }, [seen, value, reduce]);

  return (
    <span ref={ref} dir="ltr" className={className}>
      {format(0)}
    </span>
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Axis labels: 2.5K, 12K, 1.2M (Latin digits in every language). */
export function compactNumber(n: number): string {
  return compact.format(n);
}

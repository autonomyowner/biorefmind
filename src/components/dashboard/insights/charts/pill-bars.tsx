"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";
import { EASE } from "./shared";

/** Diagonal stripes for days with nothing (the same look as the gauge's remainder). */
const HATCH =
  "repeating-linear-gradient(135deg, rgba(63,108,242,0.22) 0 3px, transparent 3px 8px), rgba(255,255,255,0.55)";

/**
 * Tall, fully rounded bars, one per day. Empty days are striped outlines, `highlight` (today)
 * is navy, the best day carries its value in a bubble; hover or focus shows any day's value.
 * Bars grow from the bottom one after another, once.
 */
export function PillBars({
  values,
  labels,
  highlight,
  format,
  className,
}: {
  values: number[];
  labels: string[];
  highlight?: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...values);
  const best = max > 0 ? values.indexOf(max) : -1;
  const bubble = hover ?? (best >= 0 ? best : null);
  const key = values.join(",");

  return (
    <div dir="ltr" className={cn("flex items-end justify-between gap-2 pt-10 sm:gap-3", className)} onPointerLeave={() => setHover(null)}>
      {values.map((v, i) => {
        const empty = v <= 0;
        const today = i === highlight;
        const height = empty ? 46 : Math.max(16, (v / max) * 100);
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <button
              type="button"
              aria-label={`${labels[i]}: ${format(v)}`}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="relative flex h-44 w-full max-w-[46px] items-end rounded-full outline-none focus-visible:ring-2 focus-visible:ring-azure/50 focus-visible:ring-offset-2"
            >
              <motion.span
                key={key}
                className={cn(
                  "relative block w-full origin-bottom rounded-full",
                  empty
                    ? "border border-dashed border-azure/35"
                    : today
                      ? "btn-navy"
                      : i === best
                        ? "bg-[linear-gradient(180deg,#6f8ff6_0%,#3f6cf2_100%)]"
                        : "bg-[linear-gradient(180deg,#b5c6fb_0%,#8fa9f8_100%)]",
                  hover === i && !empty && !today ? "brightness-95" : "",
                )}
                style={{ height: `${height}%`, background: empty ? HATCH : undefined }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.07, ease: EASE }}
              />
              <AnimatePresence>
                {bubble === i ? (
                  <motion.span
                    key="bubble"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, delay: hover === null ? 0.7 : 0 }}
                    style={{ bottom: `calc(${height}% + 10px)` }}
                    className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#071733] px-2.5 py-1 text-[11px] font-semibold text-white shadow-md tabular-nums"
                  >
                    {format(v)}
                    <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-[#071733]" />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </button>
            <span className={cn("text-[12px]", today ? "font-semibold text-foreground" : "text-muted-foreground")}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

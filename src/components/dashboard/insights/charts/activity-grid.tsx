"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useLocale, useMessages } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { activityLevel, dayLabels } from "../chart-math";
import { insightsMessages } from "../insights-messages";
import { EASE } from "./shared";

const ROWS = 7;
/** Five shades of azure, from nothing to the busiest day. */
export const ACTIVITY_SHADES = ["rgba(7,23,51,0.06)", "#cdd9fc", "#97b0f8", "#6386f4", "#3f6cf2"] as const;

/**
 * Event counts per day as a grid of rounded squares: one column per week (oldest on the left),
 * 7 rows. Pointer or arrow keys show a day's date and count; "Less → More" legend underneath.
 */
export function ActivityGrid({
  values,
  start,
  count,
  className,
}: {
  /** One value per UTC day, oldest first (140 = 20 weeks). */
  values: number[];
  /** UTC midnight of the first value's day. */
  start: number;
  /** "3 sales" for a day's tooltip. */
  count: (n: number) => string;
  className?: string;
}) {
  const t = useMessages(insightsMessages).chart;
  const locale = useLocale();
  const [active, setActive] = useState<number | null>(null);
  const cols = Math.ceil(values.length / ROWS);
  const max = Math.max(0, ...values);
  const dates = dayLabels(start, values.length, locale);
  const key = values.join(",");

  function onKey(e: React.KeyboardEvent) {
    const now = active ?? values.length - 1;
    const step: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -ROWS, ArrowRight: ROWS };
    if (!(e.key in step)) return;
    e.preventDefault();
    setActive(Math.min(values.length - 1, Math.max(0, now + step[e.key])));
  }

  const a = active !== null && active < values.length ? active : null;
  const col = a === null ? 0 : Math.floor(a / ROWS);
  const row = a === null ? 0 : a % ROWS;

  return (
    <div className={className}>
      <div dir="ltr" className="relative max-w-[640px]">
        <div
          role="group"
          tabIndex={0}
          aria-label={t.chartHint}
          onKeyDown={onKey}
          onFocus={() => setActive((v) => v ?? values.length - 1)}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          className="grid gap-[3px] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-azure/40 sm:gap-1"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${ROWS}, auto)`,
            gridAutoFlow: "column",
          }}
        >
          {values.map((n, i) => (
            <motion.span
              key={`${key}-${i}`}
              onPointerEnter={() => setActive(i)}
              className={cn("block aspect-square rounded-[4px]", a === i && "ring-2 ring-[#071733] ring-offset-1")}
              style={{ background: ACTIVITY_SHADES[activityLevel(n, max)] }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.1 + Math.floor(i / ROWS) * 0.025, ease: EASE }}
            />
          ))}
        </div>

        <AnimatePresence>
          {a !== null ? (
            <motion.div
              key="tip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[#071733] px-2.5 py-1.5 text-[12px] text-white shadow-lg"
              style={{
                left: `clamp(3.5rem, ${((col + 0.5) / cols) * 100}%, calc(100% - 3.5rem))`,
                top: `calc(${(row / ROWS) * 100}% - 6px)`,
              }}
            >
              <span className="font-semibold">{dates[a]}</span> · {count(values[a])}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <span className="sr-only" aria-live="polite">
          {a !== null ? `${dates[a]}: ${count(values[a])}` : ""}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[12px] text-muted-foreground sm:max-w-[640px]">
        <span>{t.less}</span>
        <span className="flex gap-1">
          {ACTIVITY_SHADES.map((c) => (
            <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} />
          ))}
        </span>
        <span>{t.more}</span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { donutArcs } from "../chart-math";
import { COLORS, CountTo, EASE } from "./shared";

/** Segment colours: azure and violet, then their deeper and lighter tints (owner rule: no other hues). */
export const DONUT_COLORS = [COLORS.azure, COLORS.violet, COLORS.navy, "#8fa9f8", "#b6a6fa", "#c3cfe2"] as const;

const SIZE = 184;
const STROKE = 20;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export type DonutItem = { label: string; value: number; color: string };

/**
 * Ring segments with small gaps that draw in one after another, the total in the middle
 * and a legend with values. Hovering or focusing a legend row lifts its segment.
 */
export function Donut({
  items,
  total,
  totalLabel,
  format,
  className,
}: {
  items: DonutItem[];
  total: number;
  totalLabel: string;
  format: (n: number) => string;
  className?: string;
}) {
  const [hot, setHot] = useState<number | null>(null);
  const arcs = donutArcs(
    items.map((i) => i.value),
    R,
    5,
  );
  const sumAll = items.reduce((s, i) => s + i.value, 0);
  const key = items.map((i) => `${i.label}:${i.value}`).join("|");

  return (
    <div className={cn("flex flex-col items-center gap-6 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }} dir="ltr">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(7,23,51,0.06)" strokeWidth={STROKE} />
          <g key={key}>
            {arcs.map((a, i) =>
              a.length > 0 ? (
                <motion.circle
                  key={i}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={items[i].color}
                  strokeWidth={hot === i ? STROKE + 6 : STROKE}
                  strokeDashoffset={-a.start}
                  initial={{ strokeDasharray: `0 ${C}` }}
                  animate={{ strokeDasharray: `${a.length} ${C}`, opacity: hot === null || hot === i ? 1 : 0.45 }}
                  transition={{ duration: 0.7, delay: 0.2 + i * 0.12, ease: EASE, opacity: { duration: 0.2, delay: 0 } }}
                  style={{ transition: "stroke-width 200ms" }}
                />
              ) : null,
            )}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <CountTo value={total} format={format} className="text-[22px] font-semibold leading-tight tracking-[-0.02em] tabular-nums" />
          <span className="mt-0.5 text-[12px] text-muted-foreground">{totalLabel}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-1">
        {items.map((it, i) => (
          <li
            key={it.label}
            tabIndex={0}
            onPointerEnter={() => setHot(i)}
            onPointerLeave={() => setHot(null)}
            onFocus={() => setHot(i)}
            onBlur={() => setHot(null)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14px] outline-none transition-colors hover:bg-white/60 focus-visible:bg-white/70"
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: it.color }} />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            <span dir="ltr" className="shrink-0 font-semibold tabular-nums">
              {format(it.value)}
            </span>
            <span dir="ltr" className="w-11 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums">
              {sumAll ? `${Math.round((it.value / sumAll) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { COLORS, CountTo, EASE, useSvgId } from "./shared";

const W = 220;
const STROKE = 22;
const R = (W - STROKE) / 2;
const H = R + STROKE / 2 + 4;
const ARC = `M ${STROKE / 2} ${R + STROKE / 2} A ${R} ${R} 0 0 1 ${W - STROKE / 2} ${R + STROKE / 2}`;

/**
 * A half-circle gauge: the stroke draws to `value` (0..1) once, the remainder is striped,
 * the percentage sits in the middle; "—" when there is nothing to measure (`null`).
 */
export function HalfRing({ value, label, className }: { value: number | null; label?: string; className?: string }) {
  const fillId = useSvgId("ring-fill");
  const hatchId = useSvgId("ring-hatch");
  const pct = value === null ? null : Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div className={cn("relative mx-auto w-full max-w-[260px]", className)} dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.azure} />
            <stop offset="100%" stopColor={COLORS.violet} />
          </linearGradient>
          <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#e9eff9" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#c7d4ec" strokeWidth="3.5" />
          </pattern>
        </defs>
        <path d={ARC} fill="none" stroke={`url(#${hatchId})`} strokeWidth={STROKE} strokeLinecap="round" />
        {pct !== null && pct > 0 ? (
          <motion.path
            key={pct}
            d={ARC}
            fill="none"
            stroke={`url(#${fillId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: pct / 100 }}
            transition={{ duration: 1.1, delay: 0.25, ease: EASE }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        {pct === null ? (
          <span className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-muted-foreground">—</span>
        ) : (
          <CountTo
            value={pct}
            format={(n) => `${Math.round(n)}%`}
            className="text-[38px] font-semibold leading-none tracking-[-0.03em] tabular-nums"
          />
        )}
        {label ? <span className="mt-1 text-[12px] text-muted-foreground">{label}</span> : null}
      </div>
    </div>
  );
}

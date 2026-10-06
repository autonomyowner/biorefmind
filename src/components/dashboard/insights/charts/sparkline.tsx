"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { areaPath, linePath, niceMax } from "../chart-math";
import { COLORS, EASE, useSvgId } from "./shared";

const W = 100;
const H = 32;

/** A soft area and line of the period, drawn once (again when the values change). */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const id = useSvgId("spark");
  const top = niceMax(Math.max(0, ...values)) * 1.08;
  const key = `${values.length}:${values.join(",")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("block h-10 w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.azure} stopOpacity={0.28} />
          <stop offset="100%" stopColor={COLORS.azure} stopOpacity={0} />
        </linearGradient>
      </defs>
      <g key={key}>
        <motion.path
          d={areaPath(values, W, H, top, true)}
          fill={`url(#${id})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
        />
        <motion.path
          d={linePath(values, W, H, top, true)}
          fill="none"
          stroke={COLORS.azure}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.15, ease: EASE }}
        />
      </g>
    </svg>
  );
}

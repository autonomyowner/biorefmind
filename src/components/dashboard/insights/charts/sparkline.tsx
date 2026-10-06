"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { areaPath, linePath, niceMax } from "../chart-math";
import { COLORS, EASE, useSvgId, useWidth } from "./shared";

const H = 40;

/** A soft area and line of the period along a tile's bottom edge, drawn once (again when the values change). */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const id = useSvgId("spark");
  const [box, w] = useWidth<HTMLDivElement>();
  const top = niceMax(Math.max(0, ...values)) * 1.1;
  const key = `${values.length}:${values.join(",")}`;

  return (
    <div ref={box} dir="ltr" aria-hidden className={cn("w-full", className)}>
      {w > 0 ? (
        <svg width={w} height={H} className="block overflow-visible">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.azure} stopOpacity={0.26} />
              <stop offset="100%" stopColor={COLORS.azure} stopOpacity={0} />
            </linearGradient>
          </defs>
          <g key={key}>
            <motion.path
              d={areaPath(values, w, H, top, true)}
              fill={`url(#${id})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            />
            <motion.path
              d={linePath(values, w, H - 1, top, true)}
              fill="none"
              stroke={COLORS.azure}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.15, ease: EASE }}
            />
          </g>
        </svg>
      ) : (
        <div style={{ height: H }} />
      )}
    </div>
  );
}

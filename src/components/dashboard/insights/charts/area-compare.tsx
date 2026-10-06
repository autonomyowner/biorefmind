"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useMessages } from "@/i18n/provider";
import { areaPath, chartPoints, linePath, niceMax, ticks } from "../chart-math";
import { insightsMessages } from "../insights-messages";
import { COLORS, EASE, compactNumber, useSvgId, useWidth } from "./shared";

const H = 260;
const PAD = { top: 14, right: 10, bottom: 30, left: 46 };

/** Which day labels to print under the axis: about five, evenly spread (all of them for a week). */
function labelIndexes(n: number): number[] {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i);
  return [...new Set([0, 1, 2, 3, 4].map((i) => Math.round((i * (n - 1)) / 4)))];
}

/**
 * This period (azure area) against the previous one (dashed violet line), one value per day.
 * Pointer or arrow keys pick a day: guide line, ring on the point and a navy tooltip.
 */
export function AreaCompare({
  current,
  previous,
  labels,
  format,
  empty,
}: {
  current: number[];
  previous: number[];
  labels: string[];
  format: (n: number) => string;
  /** Shown over the chart when every value is 0. */
  empty?: string;
}) {
  const t = useMessages(insightsMessages).chart;
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const fillId = useSvgId("area-fill");
  const clipId = useSvgId("area-clip");

  const n = current.length;
  const top = niceMax(Math.max(0, ...current, ...previous));
  const lines = ticks(top);
  const iw = Math.max(0, width - PAD.left - PAD.right);
  const ih = H - PAD.top - PAD.bottom;
  const pts = iw ? chartPoints(current, iw, ih, top) : [];
  const prevPts = iw ? chartPoints(previous, iw, ih, top) : [];
  const xAt = (i: number) => (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const allZero = current.every((v) => v === 0) && previous.every((v) => v === 0);
  const key = `${n}:${current.join(",")}`;

  function pick(clientX: number, el: Element) {
    const r = el.getBoundingClientRect();
    const x = clientX - r.left - PAD.left;
    setActive(Math.min(n - 1, Math.max(0, Math.round((x / iw) * (n - 1)))));
  }

  function onKey(e: React.KeyboardEvent) {
    const last = n - 1;
    const now = active ?? last;
    const next =
      e.key === "ArrowLeft" ? now - 1 : e.key === "ArrowRight" ? now + 1 : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(Math.min(last, Math.max(0, next)));
  }

  const a = active !== null && active < n ? active : null;
  const tipLeft = a === null ? 0 : PAD.left + xAt(a);

  return (
    <div dir="ltr" className="relative">
      <div
        ref={box}
        tabIndex={0}
        role="group"
        aria-label={t.chartHint}
        onKeyDown={onKey}
        onFocus={() => setActive((v) => v ?? n - 1)}
        onBlur={() => setActive(null)}
        onPointerMove={(e) => iw && pick(e.clientX, e.currentTarget)}
        onPointerLeave={() => setActive(null)}
        className="relative touch-pan-y rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-azure/40"
        style={{ height: H }}
      >
        {iw > 0 ? (
          <svg width={width} height={H} className="block overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.azure} stopOpacity={0.32} />
                <stop offset="70%" stopColor={COLORS.azure} stopOpacity={0.06} />
                <stop offset="100%" stopColor={COLORS.azure} stopOpacity={0} />
              </linearGradient>
              <clipPath id={clipId}>
                <motion.rect
                  key={key}
                  x={-4}
                  y={-10}
                  height={ih + 20}
                  initial={{ width: 0 }}
                  animate={{ width: iw + 8 }}
                  transition={{ duration: 1.1, ease: EASE }}
                />
              </clipPath>
            </defs>

            <g transform={`translate(${PAD.left},${PAD.top})`}>
              {lines.map((v) => {
                const y = ih - (v / top) * ih;
                return (
                  <g key={v}>
                    <line x1={0} x2={iw} y1={y} y2={y} stroke={COLORS.grid} strokeDasharray={v === 0 ? undefined : "3 5"} />
                    <text x={-10} y={y} dy="0.32em" textAnchor="end" fontSize={11} fill={COLORS.muted}>
                      {compactNumber(v)}
                    </text>
                  </g>
                );
              })}

              {labelIndexes(n).map((i) => (
                <text
                  key={i}
                  x={xAt(i)}
                  y={ih + 20}
                  fontSize={11}
                  fill={COLORS.muted}
                  textAnchor={n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle"}
                >
                  {labels[i]}
                </text>
              ))}

              <g clipPath={`url(#${clipId})`}>
                <path
                  d={linePath(previous, iw, ih, top, true)}
                  fill="none"
                  stroke={COLORS.violet}
                  strokeOpacity={0.75}
                  strokeWidth={1.75}
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                />
                <path d={areaPath(current, iw, ih, top, true)} fill={`url(#${fillId})`} />
                <path
                  d={linePath(current, iw, ih, top, true)}
                  fill="none"
                  stroke={COLORS.azure}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {a !== null && pts[a] ? (
                <g>
                  <line x1={xAt(a)} x2={xAt(a)} y1={0} y2={ih} stroke={COLORS.navy} strokeOpacity={0.35} strokeDasharray="3 4" />
                  {prevPts[a] ? <circle cx={xAt(a)} cy={prevPts[a][1]} r={3.5} fill="#fff" stroke={COLORS.violet} strokeWidth={2} /> : null}
                  <circle cx={xAt(a)} cy={pts[a][1]} r={9} fill={COLORS.azure} fillOpacity={0.15} />
                  <circle cx={xAt(a)} cy={pts[a][1]} r={5} fill="#fff" stroke={COLORS.azure} strokeWidth={2.5} />
                </g>
              ) : null}
            </g>
          </svg>
        ) : null}

        {allZero && empty ? (
          <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-[14px] text-muted-foreground">{empty}</p>
        ) : null}

        <AnimatePresence>
          {a !== null ? (
            <motion.div
              key="tip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute top-0 z-10 w-44 rounded-xl bg-[#071733] px-3.5 py-2.5 text-[13px] text-white shadow-[0_14px_30px_-12px_rgba(4,23,58,0.6)]"
              style={{ left: `clamp(0px, ${tipLeft}px - 5.5rem, ${width}px - 11rem)` }}
            >
              <p className="font-semibold">{labels[a]}</p>
              <p className="mt-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-white/70">
                  <span className="size-2 rounded-full bg-azure" />
                  {t.thisPeriod}
                </span>
                <span className="font-semibold tabular-nums">{format(current[a])}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-white/70">
                  <span className="size-2 rounded-full bg-violet" />
                  {t.prev}
                </span>
                <span className="tabular-nums text-white/85">{format(previous[a] ?? 0)}</span>
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <span className="sr-only" aria-live="polite">
          {a !== null ? `${labels[a]}: ${format(current[a])}, ${t.prev} ${format(previous[a] ?? 0)}` : ""}
        </span>
      </div>
    </div>
  );
}

/** "— This period  - - Previous period", for the card header (follows the page direction). */
export function AreaLegend() {
  const t = useMessages(insightsMessages).chart;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
      <span className="flex items-center gap-2">
        <span className="h-[3px] w-5 rounded-full bg-azure" />
        {t.thisPeriod}
      </span>
      <span className="flex items-center gap-2">
        <svg width="20" height="4" aria-hidden>
          <line x1="1" x2="19" y1="2" y2="2" stroke={COLORS.violet} strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" />
        </svg>
        {t.previous}
      </span>
    </div>
  );
}

"use client";

import { LayoutGroup, motion } from "motion/react";

import { useMessages } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { insightsMessages } from "../insights-messages";
import type { Range } from "../sample";

const RANGES = [7, 30, 90] as const;

/** Segmented 7D / 30D / 90D switch with a sliding navy pill. */
export function RangeSwitch({ value, onChange, className }: { value: Range; onChange: (r: Range) => void; className?: string }) {
  const t = useMessages(insightsMessages).range;
  const label = { 7: t.d7, 30: t.d30, 90: t.d90 } as const;

  return (
    <LayoutGroup id="range-switch">
      <div
        role="radiogroup"
        aria-label={t.label}
        className={cn("inline-flex rounded-full border border-white bg-white/60 p-1 shadow-sm backdrop-blur", className)}
      >
        {RANGES.map((r) => {
          const on = r === value;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(r)}
              className={cn(
                "relative h-8 rounded-full px-3.5 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-azure/50",
                on ? "text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {on ? (
                <motion.span
                  layoutId="range-pill"
                  className="btn-navy absolute inset-0 rounded-full"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              ) : null}
              <span className="relative">{label[r]}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

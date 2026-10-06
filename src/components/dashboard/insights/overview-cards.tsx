"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Skeleton } from "@/components/motion";
import { DASH } from "@/components/dashboard/links";
import { Panel } from "@/components/dashboard/profile-card";
import { useDashboard } from "@/components/dashboard/shell";
import { useDashHref } from "@/components/dashboard/use-dash-href";
import { useLocale, useMessages } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { weekdayLabels } from "./chart-math";
import { HalfRing } from "./charts/half-ring";
import { PillBars } from "./charts/pill-bars";
import { CountTo } from "./charts/shared";
import { formatUnit } from "./format";
import { insightsMessages } from "./insights-messages";
import { useInsights } from "./use-insights";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §4.3–4.4

/** Overview: this week's pill bars (insights.workspace, 7 days). */
export function WeekCard({ className }: { className?: string }) {
  const { workspace } = useDashboard();
  const t = useMessages(insightsMessages);
  const locale = useLocale();
  const href = useDashHref();
  const data = useInsights(7);
  const kind = data?.kind ?? workspace.kind;
  const format = (n: number) => formatUnit(kind === "lab" ? "count" : "dzd", n, locale, t.days);

  return (
    <Panel
      title={t.week.title}
      className={cn("min-w-0", className)}
      action={
        <Link
          href={href(DASH.analytics)}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-white/60 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-white"
        >
          {t.week.link}
          <ArrowRight className="size-3.5 rtl:-scale-x-100" />
        </Link>
      }
    >
      {data ? (
        <>
          <p className="text-[13px] text-muted-foreground">{t.week.main[kind]}</p>
          <CountTo value={data.kpis[0]?.value ?? 0} format={format} className="mt-1 block text-[30px] font-semibold leading-tight tracking-[-0.03em] tabular-nums" />
          <PillBars
            values={data.series.current}
            labels={weekdayLabels(data.start, data.days, locale)}
            highlight={data.series.current.length - 1}
            format={format}
            className="mt-2"
          />
          {data.series.current.every((v) => v === 0) ? (
            <p className="mt-3 text-center text-[13px] text-muted-foreground">{t.week.empty}</p>
          ) : null}
        </>
      ) : (
        <div aria-hidden>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-9 w-32" />
          <div className="mt-12 flex items-end justify-between gap-3">
            {["h-24", "h-32", "h-20", "h-40", "h-28", "h-24", "h-36"].map((h, i) => (
              <Skeleton key={i} className={cn("w-full max-w-[46px] rounded-full", h)} />
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Overview: the all-time half ring (insights.workspace `ring`). */
export function RingCard({ className }: { className?: string }) {
  const { workspace } = useDashboard();
  const t = useMessages(insightsMessages).ring;
  const data = useInsights(7);
  const kind = data?.kind ?? workspace.kind;
  const pct = data?.ring == null ? null : Math.round(data.ring * 100);

  return (
    <Panel title={t.title[kind]} className={cn("min-w-0", className)}>
      <p className="-mt-2 mb-5 text-[13px] text-muted-foreground">{t.sub[kind]}</p>
      {data ? (
        <>
          <HalfRing value={data.ring} />
          {pct === null ? (
            <p className="mt-4 text-center text-[14px] text-muted-foreground">{t.empty}</p>
          ) : (
            <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px]">
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[linear-gradient(90deg,#3f6cf2,#7b5cf0)]" />
                {t.legend[kind].done}
                <span dir="ltr" className="font-semibold tabular-nums">
                  {pct}%
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-full border border-azure/30 bg-[repeating-linear-gradient(135deg,rgba(63,108,242,0.3)_0_2px,transparent_2px_4px)]" />
                {t.legend[kind].rest}
                <span dir="ltr" className="font-semibold tabular-nums">
                  {100 - pct}%
                </span>
              </li>
            </ul>
          )}
        </>
      ) : (
        <div aria-hidden className="flex flex-col items-center">
          <Skeleton className="h-[130px] w-full max-w-[260px] rounded-t-full rounded-b-none" />
          <Skeleton className="mt-5 h-4 w-48" />
        </div>
      )}
    </Panel>
  );
}

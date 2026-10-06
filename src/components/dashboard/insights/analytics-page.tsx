"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import { FadeIn, Skeleton } from "@/components/motion";
import { useDashboard } from "@/components/dashboard/shell";
import { useLocale, useMessages } from "@/i18n/provider";
import { catalogLabels, labelOf } from "@/lib/catalog-labels";
import type { WorkspaceInsights } from "@/lib/types";
import { cn } from "@/lib/utils";
import { changePct, dayLabels } from "./chart-math";
import { ActivityGrid } from "./charts/activity-grid";
import { AreaCompare, AreaLegend } from "./charts/area-compare";
import { DONUT_COLORS, Donut } from "./charts/donut";
import { RangeSwitch } from "./charts/range-switch";
import { COLORS, CountTo, EASE } from "./charts/shared";
import { Sparkline } from "./charts/sparkline";
import { activityStart, formatKpi, formatUnit, lowerIsBetter, shownKpis, type Unit } from "./format";
import { fill, insightsMessages, type InsightsMessages } from "./insights-messages";
import { useInsights, type Range } from "./use-insights";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §5

type Kind = WorkspaceInsights["kind"];

function parseRange(v: string | null): Range {
  return v === "7" ? 7 : v === "90" ? 90 : 30;
}

/** A frosted card with a title row; lifts slightly on hover. */
function Card({
  index,
  title,
  sub,
  action,
  children,
  className,
}: {
  index: number;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FadeIn
      index={index}
      className={cn(
        "glass min-w-0 rounded-[28px] p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-30px_rgba(4,23,58,0.45)] sm:p-7",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold tracking-[-0.015em]">{title}</h2>
          {sub ? <p className="mt-0.5 text-[14px] text-muted-foreground">{sub}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </FadeIn>
  );
}

/** The Analytics page for the signed-in account (farm, factory or lab). */
export function AnalyticsPage() {
  const { workspace } = useDashboard();
  const t = useMessages(insightsMessages);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [range, setRange] = useState<Range>(() => parseRange(params.get("range")));
  const data = useInsights(range);

  function choose(r: Range) {
    setRange(r);
    const q = new URLSearchParams(params.toString());
    q.set("range", String(r));
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }

  const kind: Kind = data?.kind ?? workspace.kind;

  return (
    <div className="space-y-5">
      <FadeIn index={0} className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">{t.analytics.title}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{t.analytics.subtitle[kind]}</p>
        </div>
        <RangeSwitch value={range} onChange={choose} />
      </FadeIn>

      {data ? <Loaded data={data} stale={data.days !== range} /> : <AnalyticsSkeleton />}
    </div>
  );
}

function Loaded({ data, stale }: { data: WorkspaceInsights; stale: boolean }) {
  const t = useMessages(insightsMessages);
  const labels = useMessages(catalogLabels);
  const locale = useLocale();
  const kind = data.kind;
  const fmt = (unit: Unit) => (n: number) => formatUnit(unit, n, locale, t.days);
  const mainUnit: Unit = kind === "lab" ? "count" : "dzd";

  const names: Record<string, string> = kind === "lab" ? labels.analyses : labels.residues;
  const donutItems = data.breakdown.map((b, i) => ({
    label: b.key === "rest" ? t.chart.others : labelOf(names, b.key),
    value: b.value,
    color: b.key === "rest" ? DONUT_COLORS[DONUT_COLORS.length - 1] : DONUT_COLORS[i % (DONUT_COLORS.length - 1)],
  }));
  const donutTotal = data.breakdown.reduce((s, b) => s + b.value, 0);
  const accept = data.kpis.find((k) => k.key === "acceptRate");

  return (
    <div className={cn("space-y-5 transition-opacity duration-300", stale && "opacity-60")} aria-busy={stale}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shownKpis(data.kpis).map((k, i) => (
          <FadeIn
            key={k.key}
            index={i + 1}
            className="glass relative flex min-w-0 flex-col overflow-hidden rounded-[24px] transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-30px_rgba(4,23,58,0.45)]"
          >
            <div className="px-5 pt-5">
              <p className="text-[13px] font-medium text-muted-foreground">{(t.kpi as Record<string, string>)[k.key] ?? k.key}</p>
              <CountTo
                value={k.value}
                format={(n) => formatKpi(k.key, n, locale, t.days)}
                className="mt-2 block text-[28px] font-semibold leading-tight tracking-[-0.03em] tabular-nums"
              />
              <Change value={k.value} previous={k.previous} invert={lowerIsBetter(kind, k.key)} days={data.days} />
              {k.key === "offersSent" && accept ? (
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {fill(t.acceptance, { pct: formatKpi("acceptRate", accept.value, locale, t.days) })}
                </p>
              ) : null}
            </div>
            <Sparkline values={k.spark} className="mt-auto pt-4" />
          </FadeIn>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <Card index={5} title={t.area[kind].title} sub={t.area[kind].sub} action={<AreaLegend />} className="lg:col-span-2">
          <AreaCompare
            current={data.series.current}
            previous={data.series.previous}
            labels={dayLabels(data.start, data.days, locale)}
            format={fmt(mainUnit)}
            empty={t.empty[kind]}
          />
        </Card>
        <Card index={6} title={t.donut[kind].title}>
          <Donut items={donutItems} total={donutTotal} totalLabel={t.donut[kind].center} format={fmt(mainUnit)} />
          {donutItems.length === 0 ? <p className="mt-3 text-center text-[14px] text-muted-foreground">{t.empty[kind]}</p> : null}
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <Card index={7} title={t.activity.title} sub={t.activity[kind].sub} className="lg:col-span-2">
          <ActivityGrid
            values={data.activity}
            start={activityStart(data)}
            count={(n) => (n === 1 ? t.activity[kind].one : fill(t.activity[kind].many, { n }))}
          />
        </Card>
        <Card index={8} title={t.top[kind].title}>
          <TopList top={data.top} kind={kind} t={t} format={fmt("dzd")} />
        </Card>
      </div>
    </div>
  );
}

/** "▲ 12.5% vs previous 30 days" — green when it is good news, red when not, muted when unknown. */
function Change({ value, previous, invert, days }: { value: number; previous: number; invert: boolean; days: number }) {
  const t = useMessages(insightsMessages).change;
  const pct = changePct(value, previous);
  if (pct === null) return <p className="mt-1 text-[12.5px] text-muted-foreground">— {t.none}</p>;
  const color = pct === 0 ? COLORS.muted : pct > 0 !== invert ? COLORS.up : COLORS.down;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
      <span dir="ltr" className="font-semibold tabular-nums" style={{ color }}>
        {pct > 0 ? "▲ " : pct < 0 ? "▼ " : ""}
        {Math.abs(pct)}%
      </span>
      <span className="text-muted-foreground">{fill(t.vs, { days })}</span>
    </p>
  );
}

/** Partners by value, each with a thin azure bar. */
function TopList({
  top,
  kind,
  t,
  format,
}: {
  top: WorkspaceInsights["top"];
  kind: Kind;
  t: InsightsMessages;
  format: (n: number) => string;
}) {
  if (top.length === 0) return <p className="text-[14px] text-muted-foreground">{t.empty[kind]}</p>;
  const max = Math.max(...top.map((p) => p.value), 1);
  return (
    <ol className="space-y-4">
      {top.map((p, i) => (
        <li key={p.name} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[15px] font-medium">{p.name}</span>
            <span dir="ltr" className="shrink-0 text-[14px] font-semibold tabular-nums">
              {format(p.value)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
            <motion.div
              key={`${p.name}:${p.value}`}
              className="h-full origin-left rounded-full bg-[linear-gradient(90deg,#3f6cf2,#7b5cf0)] rtl:origin-right"
              style={{ width: `${(p.value / max) * 100}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: EASE }}
            />
          </div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {p.count === 1 ? t.top[kind].one : fill(t.top[kind].many, { n: p.count })}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** The page's own layout in grey while the first answer loads. */
function AnalyticsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[168px] rounded-[24px]" />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <Skeleton className="h-[372px] rounded-[28px] lg:col-span-2" />
        <Skeleton className="h-[372px] rounded-[28px]" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <Skeleton className="h-[300px] rounded-[28px] lg:col-span-2" />
        <Skeleton className="h-[300px] rounded-[28px]" />
      </div>
    </div>
  );
}

import { ConvexError } from "convex/values";

// Design and contract: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §7

export const DAY = 86_400_000;
export const INSIGHTS_REFUSE = { days: "Choose 7, 30 or 90 days." } as const;
const ACTIVITY_DAYS = 140; // 20 weeks

export type Range = 7 | 30 | 90;
export type Kpi = { key: string; value: number; previous: number; spark: number[] };
export type Insights = {
  kind: "farm" | "factory" | "lab";
  days: Range;
  start: number;
  kpis: Kpi[];
  series: { current: number[]; previous: number[] };
  breakdown: { key: string; value: number }[];
  top: { name: string; value: number; count: number }[];
  activity: number[];
  ring: number | null;
};

export function cleanDays(days: number): Range {
  if (days !== 7 && days !== 30 && days !== 90) throw new ConvexError(INSIGHTS_REFUSE.days);
  return days;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const dayStart = (ms: number) => Math.floor(ms / DAY) * DAY;
const sum = <R>(rows: R[], f: (r: R) => number) => rows.reduce((s, r) => s + f(r), 0);

type Window = { start: number; days: number };

/** The last `days` UTC days (today included) and the `days` before them. */
export function periods(now: number, days: number): { current: Window; previous: Window } {
  const start = dayStart(now) - (days - 1) * DAY;
  return { current: { start, days }, previous: { start: start - days * DAY, days } };
}

/** Event counts per UTC day over the 20 weeks ending today, oldest first. */
export function activityDays(now: number, ats: number[]): number[] {
  const first = dayStart(now) - (ACTIVITY_DAYS - 1) * DAY;
  const out = new Array<number>(ACTIVITY_DAYS).fill(0);
  for (const a of ats) {
    const i = Math.floor((a - first) / DAY);
    if (i >= 0 && i < ACTIVITY_DAYS) out[i] += 1;
  }
  return out;
}

/** A figure worked out from the rows whose time (`at`) falls in a window. */
type Metric<R> = { key: string; at: (r: R) => number | undefined; calc: (rows: R[]) => number };

function within<R>(rows: R[], at: Metric<R>["at"], w: Window): R[] {
  const end = w.start + w.days * DAY;
  return rows.filter((r) => {
    const t = at(r);
    return t !== undefined && t >= w.start && t < end;
  });
}

function daily<R>(m: Metric<R>, rows: R[], w: Window): number[] {
  return Array.from({ length: w.days }, (_, i) => m.calc(within(rows, m.at, { start: w.start + i * DAY, days: 1 })));
}

function kpi<R>(m: Metric<R>, rows: R[], p: ReturnType<typeof periods>): Kpi {
  return {
    key: m.key,
    value: m.calc(within(rows, m.at, p.current)),
    previous: m.calc(within(rows, m.at, p.previous)),
    spark: daily(m, rows, p.current),
  };
}

/** Totals per key, largest first (ties by key); at most `keep`, the remainder lumped as "rest" when asked. */
function ranked(totals: Map<string, number>, keep: number, lumpRest: boolean): { key: string; value: number }[] {
  const all = [...totals].map(([key, value]) => ({ key, value: r2(value) }));
  all.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  if (all.length <= keep || !lumpRest) return all.slice(0, keep);
  return [...all.slice(0, keep), { key: "rest", value: r2(sum(all.slice(keep), (x) => x.value)) }];
}

function tally<R>(rows: R[], key: (r: R) => string, value: (r: R) => number): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + value(r));
  return m;
}

function topPartners<R>(rows: R[], name: (r: R) => string, value: (r: R) => number) {
  const values = tally(rows, name, value);
  const counts = tally(rows, name, () => 1);
  return ranked(values, 5, false).map(({ key, value: v }) => ({ name: key, value: v, count: counts.get(key) ?? 0 }));
}

function build<R>(
  kind: Insights["kind"],
  now: number,
  days: number,
  rows: R[],
  metrics: Metric<R>[],
  rest: Pick<Insights, "breakdown" | "top" | "activity" | "ring">,
): Insights {
  const range = cleanDays(days);
  const p = periods(now, range);
  const main = metrics[0];
  return {
    kind,
    days: range,
    start: p.current.start,
    kpis: metrics.map((m) => kpi(m, rows, p)),
    series: { current: daily(main, rows, p.current), previous: daily(main, rows, p.previous) },
    ...rest,
  };
}

/* ---------- Farm ---------- */

export type FarmInput = {
  now: number;
  days: number;
  sales: { createdAt: number; totalDzd: number; quantityKg: number; residue: string; buyerName: string }[];
  listings: { quantityKg: number; remainingKg: number; status: "open" | "sold" | "withdrawn" }[];
};

export function farmInsights({ now, days, sales, listings }: FarmInput): Insights {
  type S = FarmInput["sales"][number];
  const at = (s: S) => s.createdAt;
  const metrics: Metric<S>[] = [
    { key: "soldDzd", at, calc: (r) => r2(sum(r, (s) => s.totalDzd)) },
    { key: "soldKg", at, calc: (r) => sum(r, (s) => s.quantityKg) },
    { key: "sales", at, calc: (r) => r.length },
    { key: "avgDzdPerKg", at, calc: (r) => perKg(sum(r, (s) => s.totalDzd), sum(r, (s) => s.quantityKg)) },
  ];
  const current = within(sales, at, periods(now, cleanDays(days)).current);
  // Withdrawn lots that never sold anything say nothing about how well the farm sells.
  const counted = listings.filter((l) => !(l.status === "withdrawn" && l.remainingKg === l.quantityKg));
  const listed = sum(counted, (l) => l.quantityKg);
  return build("farm", now, days, sales, metrics, {
    breakdown: ranked(tally(current, (s) => s.residue, (s) => s.totalDzd), 5, true),
    top: topPartners(current, (s) => s.buyerName, (s) => s.totalDzd),
    activity: activityDays(now, sales.map(at)),
    ring: listed > 0 ? share(sum(counted, (l) => l.quantityKg - l.remainingKg), listed) : null,
  });
}

/* ---------- Factory ---------- */

type OfferStatus = "pending" | "accepted" | "declined" | "withdrawn";
export type FactoryInput = {
  now: number;
  days: number;
  sales: { createdAt: number; totalDzd: number; feeDzd: number; quantityKg: number; residue: string; sellerName: string }[];
  offers: { createdAt: number; status: OfferStatus }[];
};

export function factoryInsights({ now, days, sales, offers }: FactoryInput): Insights {
  // One row type for both, so every KPI shares the same windows.
  type Row = { createdAt: number; sale?: FactoryInput["sales"][number]; offer?: FactoryInput["offers"][number] };
  const rows: Row[] = [...sales.map((sale) => ({ createdAt: sale.createdAt, sale })), ...offers.map((offer) => ({ createdAt: offer.createdAt, offer }))];
  const at = (r: Row) => r.createdAt;
  const S = (r: Row[]) => r.flatMap((x) => (x.sale ? [x.sale] : []));
  const O = (r: Row[]) => r.flatMap((x) => (x.offer ? [x.offer] : []));
  const metrics: Metric<Row>[] = [
    { key: "spentDzd", at, calc: (r) => r2(sum(S(r), (s) => s.totalDzd + s.feeDzd)) },
    { key: "boughtKg", at, calc: (r) => sum(S(r), (s) => s.quantityKg) },
    { key: "offersSent", at, calc: (r) => O(r).length },
    { key: "acceptRate", at, calc: (r) => r2(acceptance(O(r)) ?? 0) },
    { key: "avgDzdPerKg", at, calc: (r) => perKg(sum(S(r), (s) => s.totalDzd), sum(S(r), (s) => s.quantityKg)) },
  ];
  const current = within(sales, (s) => s.createdAt, periods(now, cleanDays(days)).current);
  const ring = acceptance(offers);
  return build("factory", now, days, rows, metrics, {
    breakdown: ranked(tally(current, (s) => s.residue, (s) => s.totalDzd), 5, true),
    top: topPartners(current, (s) => s.sellerName, (s) => s.totalDzd),
    activity: activityDays(now, rows.map(at)),
    ring: ring === null ? null : share(ring, 1),
  });
}

/** Accepted ÷ answered (accepted + declined); null when nothing was answered. */
function acceptance(offers: { status: OfferStatus }[]): number | null {
  const accepted = offers.filter((o) => o.status === "accepted").length;
  const answered = accepted + offers.filter((o) => o.status === "declined").length;
  return answered ? accepted / answered : null;
}

/* ---------- Lab ---------- */

export type LabInput = {
  now: number;
  days: number;
  requests: {
    createdAt: number;
    status: "requested" | "accepted" | "declined" | "received" | "released" | "cancelled";
    totalDzd: number;
    receivedAt?: number;
    releasedAt?: number;
    dueAt?: number;
    analyses: string[];
    clientName: string;
  }[];
};

export function labInsights({ now, days, requests }: LabInput): Insights {
  type Q = LabInput["requests"][number];
  const created = (q: Q) => q.createdAt;
  const released = (q: Q) => q.releasedAt;
  const turnarounds = (r: Q[]) => r.flatMap((q) => (q.receivedAt && q.releasedAt ? [(q.releasedAt - q.receivedAt) / DAY] : []));
  const metrics: Metric<Q>[] = [
    { key: "requests", at: created, calc: (r) => r.length },
    { key: "released", at: released, calc: (r) => r.length },
    { key: "revenueDzd", at: released, calc: (r) => r2(sum(r, (q) => q.totalDzd)) },
    {
      key: "avgTurnaroundDays",
      at: released,
      calc: (r) => {
        const t = turnarounds(r);
        return t.length ? r1(sum(t, (x) => x) / t.length) : 0;
      },
    },
  ];
  const current = within(requests, created, periods(now, cleanDays(days)).current);
  const billed = current.filter((q) => q.status !== "declined" && q.status !== "cancelled");
  const timed = requests.filter((q) => q.releasedAt && q.dueAt);
  return build("lab", now, days, requests, metrics, {
    breakdown: ranked(tally(current.flatMap((q) => q.analyses), (k) => k, () => 1), 5, true),
    top: topPartners(billed, (q) => q.clientName, (q) => q.totalDzd),
    activity: activityDays(now, requests.map(created)),
    ring: timed.length ? share(timed.filter((q) => q.releasedAt! <= q.dueAt!).length, timed.length) : null,
  });
}

const perKg = (dzd: number, kg: number) => (kg > 0 ? r2(dzd / kg) : 0);
const share = (part: number, whole: number) => Math.round((part / whole) * 10_000) / 10_000;

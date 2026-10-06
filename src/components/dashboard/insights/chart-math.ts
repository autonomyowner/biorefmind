import type { Locale } from "@/i18n/locale";

// Small pure helpers behind the dashboard charts (design §5). No React here.

const clean = (n: number) => Number(n.toPrecision(12));
const fmt = (n: number) => String(Math.round(n * 100) / 100);

/** Percent change from `previous` to `value`, 1 decimal; null when there is nothing to compare with. */
export function changePct(value: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((value - previous) / Math.abs(previous)) * 1000) / 10;
}

const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** A round axis top at or above `max` (7 → 8, 13 → 15, 2340 → 2500); 1 when there is nothing. */
export function niceMax(max: number): number {
  if (!(max > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  const step = STEPS.find((s) => clean(s * mag) >= max) ?? 10;
  return clean(step * mag);
}

/** Evenly spaced ticks from 0 to `top`, about `n` steps, each a multiple of half the top's magnitude. */
export function ticks(top: number, n = 4): number[] {
  const half = 10 ** Math.floor(Math.log10(top)) / 2;
  const tries = [n, n - 1, n + 1, n - 2, n + 2].filter((k) => k >= 1);
  const count =
    tries.find((k) => {
      const q = top / k / half;
      return Math.abs(q - Math.round(q)) < 1e-9;
    }) ?? n;
  return Array.from({ length: count + 1 }, (_, i) => clean((top / count) * i));
}

type Pt = [number, number];

/** Chart coordinates: x spread evenly over `w`, y = h − v/top·h (values clipped to 0..top). */
export function chartPoints(values: number[], w: number, h: number, top: number): Pt[] {
  const vs = values.length === 1 ? [values[0], values[0]] : values;
  const n = vs.length;
  return vs.map((v, i) => {
    const clipped = Math.min(Math.max(v, 0), top);
    return [n === 1 ? 0 : (i * w) / (n - 1), h - (clipped / top) * h];
  });
}

const sign = (x: number) => (x < 0 ? -1 : 1);

/** Monotone cubic tangents (Fritsch–Carlson, as d3's curveMonotoneX): the curve never overshoots a point. */
function tangents(p: Pt[]): number[] {
  const n = p.length;
  const t = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const h0 = p[i][0] - p[i - 1][0];
    const h1 = p[i + 1][0] - p[i][0];
    const s0 = (p[i][1] - p[i - 1][1]) / h0;
    const s1 = (p[i + 1][1] - p[i][1]) / h1;
    const m = (s0 * h1 + s1 * h0) / (h0 + h1);
    t[i] = (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(m)) || 0;
  }
  if (n > 2) {
    const h0 = p[1][0] - p[0][0];
    t[0] = (3 * (p[1][1] - p[0][1])) / h0 / 2 - t[1] / 2;
    const hn = p[n - 1][0] - p[n - 2][0];
    t[n - 1] = (3 * (p[n - 1][1] - p[n - 2][1])) / hn / 2 - t[n - 2] / 2;
  }
  return t;
}

function pathOf(p: Pt[], smooth: boolean): string {
  if (p.length === 0) return "";
  const head = `M${fmt(p[0][0])} ${fmt(p[0][1])}`;
  if (!smooth || p.length < 3) return [head, ...p.slice(1).map(([x, y]) => `L${fmt(x)} ${fmt(y)}`)].join(" ");
  const t = tangents(p);
  const segs = p.slice(1).map(([x1, y1], j) => {
    const [x0, y0] = p[j];
    const dx = (x1 - x0) / 3;
    return `C${fmt(x0 + dx)} ${fmt(y0 + dx * t[j])} ${fmt(x1 - dx)} ${fmt(y1 - dx * t[j + 1])} ${fmt(x1)} ${fmt(y1)}`;
  });
  return [head, ...segs].join(" ");
}

/** SVG path of the values as a line (`smooth` = monotone curve through every point). */
export function linePath(values: number[], w: number, h: number, top: number, smooth = false): string {
  if (values.length === 0) return "";
  return pathOf(chartPoints(values, w, h, top), smooth);
}

/** The same line closed along the bottom edge, for a filled area. */
export function areaPath(values: number[], w: number, h: number, top: number, smooth = false): string {
  if (values.length === 0) return "";
  const p = chartPoints(values, w, h, top);
  return `${pathOf(p, smooth)} L${fmt(p[p.length - 1][0])} ${fmt(h)} L${fmt(p[0][0])} ${fmt(h)} Z`;
}

export type Arc = { start: number; length: number };

/**
 * Donut segments as distances along the circle (for stroke-dasharray / dashoffset):
 * each value's share of the circumference minus a `gap`, so arcs + gaps make the whole circle.
 * A single non-zero value fills the circle with no gap. Nothing to show gives no arcs.
 */
export function donutArcs(values: number[], r: number, gap: number): Arc[] {
  const total = values.reduce((s, v) => s + Math.max(v, 0), 0);
  if (total <= 0) return [];
  const c = 2 * Math.PI * r;
  const g = values.filter((v) => v > 0).length === 1 ? 0 : gap;
  let at = 0;
  return values.map((v) => {
    const share = (Math.max(v, 0) / total) * c;
    const arc = { start: at, length: v > 0 ? Math.max(share - g, 0) : 0 };
    at += share;
    return arc;
  });
}

const DAY = 86_400_000;
const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-u-nu-latn" : "en-US");

/** "Oct 1", "Oct 2", … for `days` UTC days from `start` (Latin digits in Arabic too). */
export function dayLabels(start: number, days: number, locale: Locale): string[] {
  const f = new Intl.DateTimeFormat(intlLocale(locale), { month: "short", day: "numeric", timeZone: "UTC" });
  return Array.from({ length: days }, (_, i) => f.format(start + i * DAY));
}

/** "Thu", "Fri", … for `days` UTC days from `start`. */
export function weekdayLabels(start: number, days: number, locale: Locale): string[] {
  const f = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" });
  return Array.from({ length: days }, (_, i) => f.format(start + i * DAY));
}

/** Shade for the activity grid: 0 for nothing, then 1..4 by share of the busiest day. */
export function activityLevel(n: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (n <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((n / max) * 4))) as 1 | 2 | 3 | 4;
}

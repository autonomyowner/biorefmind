import type { WorkspaceInsights } from "@/lib/types";

// The guest preview's analytics: a farm in Sétif. Every number comes from the day's
// index (no randomness), so the server and the browser draw the same thing.

export type Range = 7 | 30 | 90;

const DAY = 86_400_000;
const ACTIVITY_DAYS = 140;
const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

/** One day of the sample farm, by absolute UTC day number. */
function day(d: number): { dzd: number; kg: number; sales: number } {
  if (d % 6 === 2 || d % 11 === 5) return { dzd: 0, kg: 0, sales: 0 };
  const wave = 9000 + 4200 * Math.sin(d * 0.45) + 2600 * Math.sin(d * 1.7 + 1) + 260 * ((d * 37) % 10);
  const dzd = Math.max(1500, Math.round(wave / 100) * 100);
  const price = 15 + ((d * 13) % 7) * 0.5; // DA per kg
  return { dzd, kg: Math.round(dzd / price / 10) * 10, sales: d % 3 === 0 ? 2 : 1 };
}

const RESIDUES = [
  { key: "pomegranate_peels", share: 0.46 },
  { key: "olive_pomace", share: 0.32 },
  { key: "date_pits", share: 0.22 },
];
const BUYERS = [
  { name: "Peel Factory Sétif", share: 0.48 },
  { name: "Bio Extraits Est", share: 0.33 },
  { name: "Agro Pectine DZ", share: 0.19 },
];

/** A believable farm's insights for the last `days` days ending at `now`. */
export function sampleInsights(days: Range, now: number): WorkspaceInsights {
  const today = Math.floor(now / DAY);
  const first = today - (days - 1);
  const window = (from: number) => Array.from({ length: days }, (_, i) => day(from + i));
  const cur = window(first);
  const prev = window(first - days);

  const dzd = (w: typeof cur) => w.map((x) => x.dzd);
  const kg = (w: typeof cur) => w.map((x) => x.kg);
  const count = (w: typeof cur) => w.map((x) => x.sales);
  const perKg = (w: typeof cur) => (sum(kg(w)) ? r2(sum(dzd(w)) / sum(kg(w))) : 0);

  const soldDzd = sum(dzd(cur));
  const sales = sum(count(cur));
  return {
    kind: "farm",
    days,
    start: first * DAY,
    kpis: [
      { key: "soldDzd", value: soldDzd, previous: sum(dzd(prev)), spark: dzd(cur) },
      { key: "soldKg", value: sum(kg(cur)), previous: sum(kg(prev)), spark: kg(cur) },
      { key: "sales", value: sales, previous: sum(count(prev)), spark: count(cur) },
      { key: "avgDzdPerKg", value: perKg(cur), previous: perKg(prev), spark: cur.map((x) => (x.kg ? r2(x.dzd / x.kg) : 0)) },
    ],
    series: { current: dzd(cur), previous: dzd(prev) },
    breakdown: soldDzd ? RESIDUES.map((r) => ({ key: r.key, value: Math.round(soldDzd * r.share) })) : [],
    top: soldDzd
      ? BUYERS.map((b) => ({ name: b.name, value: Math.round(soldDzd * b.share), count: Math.max(1, Math.round(sales * b.share)) }))
      : [],
    activity: Array.from({ length: ACTIVITY_DAYS }, (_, i) => day(today - (ACTIVITY_DAYS - 1) + i).sales),
    ring: 0.62,
  };
}

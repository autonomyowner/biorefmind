import { describe, expect, test } from "vitest";
import {
  DAY,
  INSIGHTS_REFUSE,
  activityDays,
  cleanDays,
  factoryInsights,
  farmInsights,
  labInsights,
  periods,
  type FactoryInput,
  type FarmInput,
  type LabInput,
} from "./insights";

// 2026-10-06 15:00 UTC: "today" is the 6th.
const NOW = Date.UTC(2026, 9, 6, 15);
const TODAY = Date.UTC(2026, 9, 6);
const at = (daysAgo: number, hour = 10) => TODAY - daysAgo * DAY + hour * 3_600_000;

describe("cleanDays and periods", () => {
  test("only 7, 30 or 90", () => {
    expect(cleanDays(7)).toBe(7);
    expect(cleanDays(30)).toBe(30);
    expect(cleanDays(90)).toBe(90);
    for (const bad of [0, 1, 14, 31, 7.5, Number.NaN]) expect(() => cleanDays(bad)).toThrow(INSIGHTS_REFUSE.days);
  });

  test("the current period ends today (UTC); the previous one is just before it", () => {
    const p = periods(NOW, 7);
    expect(p.current).toEqual({ start: TODAY - 6 * DAY, days: 7 });
    expect(p.previous).toEqual({ start: TODAY - 13 * DAY, days: 7 });
  });

  test("activity covers 140 days ending today, oldest first", () => {
    const a = activityDays(NOW, [at(0), at(0), at(139), at(140), NOW + DAY]);
    expect(a).toHaveLength(140);
    expect(a[139]).toBe(2);
    expect(a[0]).toBe(1);
    expect(a.reduce((s, n) => s + n, 0)).toBe(3);
  });
});

describe("farmInsights", () => {
  const input: FarmInput = {
    now: NOW,
    days: 7,
    sales: [
      { createdAt: at(0), totalDzd: 30_000, quantityKg: 2000, residue: "olive_pomace", buyerName: "Peel Factory" },
      { createdAt: at(2), totalDzd: 3000, quantityKg: 100, residue: "date_pits", buyerName: "Bio Est" },
      { createdAt: at(2, 20), totalDzd: 1500, quantityKg: 100, residue: "other", buyerName: "Peel Factory" },
      { createdAt: at(8), totalDzd: 10_000, quantityKg: 1000, residue: "olive_pomace", buyerName: "Bio Est" }, // previous
      { createdAt: at(20), totalDzd: 99, quantityKg: 1, residue: "olive_pomace", buyerName: "Old" }, // outside both
    ],
    listings: [
      { quantityKg: 3000, remainingKg: 1000, status: "open" },
      { quantityKg: 1000, remainingKg: 0, status: "sold" },
      { quantityKg: 500, remainingKg: 500, status: "withdrawn" }, // nothing sold: left out
      { quantityKg: 1000, remainingKg: 500, status: "withdrawn" }, // half sold: counts
    ],
  };
  const r = farmInsights(input);

  test("KPIs for this period against the previous one", () => {
    expect(r.kind).toBe("farm");
    expect(r.days).toBe(7);
    expect(r.start).toBe(TODAY - 6 * DAY);
    expect(r.kpis.map((k) => [k.key, k.value, k.previous])).toEqual([
      ["soldDzd", 34_500, 10_000],
      ["soldKg", 2200, 1000],
      ["sales", 3, 1],
      ["avgDzdPerKg", 15.68, 10],
    ]);
  });

  test("sparks and series are per day, oldest first", () => {
    const sold = r.kpis[0];
    expect(sold.spark).toEqual([0, 0, 0, 0, 4500, 0, 30_000]);
    expect(r.series.current).toEqual(sold.spark);
    expect(r.series.previous).toEqual([0, 0, 0, 0, 0, 10_000, 0]);
    expect(r.kpis[3].spark).toEqual([0, 0, 0, 0, 22.5, 0, 15]);
  });

  test("breakdown by residue, top buyers, activity, ring", () => {
    expect(r.breakdown).toEqual([
      { key: "olive_pomace", value: 30_000 },
      { key: "date_pits", value: 3000 },
      { key: "other", value: 1500 },
    ]);
    expect(r.top).toEqual([
      { name: "Peel Factory", value: 31_500, count: 2 },
      { name: "Bio Est", value: 3000, count: 1 },
    ]);
    expect(r.activity[139]).toBe(1);
    expect(r.activity.reduce((s, n) => s + n, 0)).toBe(5);
    // sold (2000 + 1000 + 500) of listed (3000 + 1000 + 1000)
    expect(r.ring).toBe(0.7);
  });

  test("an empty farm has zeros and no ring", () => {
    const e = farmInsights({ now: NOW, days: 30, sales: [], listings: [] });
    expect(e.kpis.every((k) => k.value === 0 && k.previous === 0 && k.spark.length === 30)).toBe(true);
    expect(e.series.previous).toHaveLength(30);
    expect(e.breakdown).toEqual([]);
    expect(e.top).toEqual([]);
    expect(e.ring).toBeNull();
  });

  test("breakdown keeps five and lumps the rest", () => {
    const keys = ["a", "b", "c", "d", "e", "f", "g"];
    const many = farmInsights({
      now: NOW,
      days: 7,
      listings: [],
      sales: keys.map((k, i) => ({ createdAt: at(0), totalDzd: 100 - i, quantityKg: 1, residue: k, buyerName: k })),
    });
    expect(many.breakdown.map((b) => b.key)).toEqual(["a", "b", "c", "d", "e", "rest"]);
    expect(many.breakdown[5].value).toBe(94 + 95);
    expect(many.top).toHaveLength(5);
  });
});

describe("factoryInsights", () => {
  const input: FactoryInput = {
    now: NOW,
    days: 7,
    sales: [
      { createdAt: at(1), totalDzd: 20_000, feeDzd: 1000, quantityKg: 1000, residue: "olive_pomace", sellerName: "Ferme A" },
      { createdAt: at(9), totalDzd: 4000, feeDzd: 200, quantityKg: 200, residue: "date_pits", sellerName: "Ferme B" },
    ],
    offers: [
      { createdAt: at(1), status: "accepted" },
      { createdAt: at(1), status: "declined" },
      { createdAt: at(0), status: "pending" },
      { createdAt: at(3), status: "declined" },
      { createdAt: at(9), status: "accepted" },
    ],
  };
  const r = factoryInsights(input);

  test("KPIs", () => {
    expect(r.kind).toBe("factory");
    expect(r.kpis.map((k) => [k.key, k.value, k.previous])).toEqual([
      ["spentDzd", 21_000, 4200],
      ["boughtKg", 1000, 200],
      ["offersSent", 4, 1],
      ["acceptRate", 0.33, 1],
      ["avgDzdPerKg", 20, 20],
    ]);
    expect(r.series.current).toEqual([0, 0, 0, 0, 0, 21_000, 0]);
  });

  test("breakdown, top sellers, activity (offers + sales), ring over all answered offers", () => {
    expect(r.breakdown).toEqual([{ key: "olive_pomace", value: 20_000 }]);
    expect(r.top).toEqual([{ name: "Ferme A", value: 20_000, count: 1 }]);
    expect(r.activity.reduce((s, n) => s + n, 0)).toBe(7);
    expect(r.ring).toBe(0.5); // 2 accepted of 4 answered
    expect(factoryInsights({ now: NOW, days: 7, sales: [], offers: [{ createdAt: at(0), status: "pending" }] }).ring).toBeNull();
  });
});

describe("labInsights", () => {
  const input: LabInput = {
    now: NOW,
    days: 7,
    requests: [
      {
        createdAt: at(6),
        status: "released",
        totalDzd: 8000,
        receivedAt: at(5),
        releasedAt: at(1),
        dueAt: at(1, 23),
        analyses: ["moisture", "polyphenols"],
        clientName: "Ferme A",
      },
      {
        createdAt: at(10),
        status: "released",
        totalDzd: 5000,
        receivedAt: at(9),
        releasedAt: at(2),
        dueAt: at(5),
        analyses: ["moisture"],
        clientName: "Ferme B",
      },
      { createdAt: at(0), status: "requested", totalDzd: 3000, analyses: ["moisture"], clientName: "Ferme A" },
      { createdAt: at(3), status: "declined", totalDzd: 9000, analyses: ["mold"], clientName: "Ferme C" },
      { createdAt: at(12), status: "cancelled", totalDzd: 1000, analyses: ["mold"], clientName: "Ferme C" },
    ],
  };
  const r = labInsights(input);

  test("KPIs", () => {
    expect(r.kind).toBe("lab");
    expect(r.kpis.map((k) => [k.key, k.value, k.previous])).toEqual([
      ["requests", 3, 2],
      ["released", 2, 0],
      ["revenueDzd", 13_000, 0],
      ["avgTurnaroundDays", 5.5, 0], // (4 + 7) / 2
    ]);
    expect(r.series.current).toEqual([1, 0, 0, 1, 0, 0, 1]);
  });

  test("analyses counted, clients by DA without declined/cancelled, ring = on time share", () => {
    expect(r.breakdown).toEqual([
      { key: "moisture", value: 2 },
      { key: "mold", value: 1 },
      { key: "polyphenols", value: 1 },
    ]);
    expect(r.top).toEqual([{ name: "Ferme A", value: 11_000, count: 2 }]);
    expect(r.ring).toBe(0.5); // the first was on time, the second late
    expect(r.activity.reduce((s, n) => s + n, 0)).toBe(5);
  });
});

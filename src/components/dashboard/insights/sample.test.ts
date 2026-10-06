import { describe, expect, test } from "vitest";
import { sampleInsights } from "./sample";

const NOW = Date.UTC(2026, 9, 6, 15);

describe("sampleInsights (guest preview)", () => {
  test("has the contract's shape for each range", () => {
    for (const days of [7, 30, 90] as const) {
      const s = sampleInsights(days, NOW);
      expect(s.kind).toBe("farm");
      expect(s.days).toBe(days);
      expect(s.start).toBe(Date.UTC(2026, 9, 6) - (days - 1) * 86_400_000);
      expect(s.series.current).toHaveLength(days);
      expect(s.series.previous).toHaveLength(days);
      expect(s.kpis.map((k) => k.key)).toEqual(["soldDzd", "soldKg", "sales", "avgDzdPerKg"]);
      for (const k of s.kpis) expect(k.spark).toHaveLength(days);
      expect(s.activity).toHaveLength(140);
      expect(s.ring).toBe(0.62);
    }
  });

  test("is the same every time and has a few empty days", () => {
    const a = sampleInsights(30, NOW);
    expect(sampleInsights(30, NOW)).toEqual(a);
    const zeros = a.series.current.filter((v) => v === 0).length;
    expect(zeros).toBeGreaterThan(0);
    expect(zeros).toBeLessThan(15);
    expect(sampleInsights(7, NOW).series.current).toContain(0);
  });

  test("the KPI total matches the series", () => {
    const s = sampleInsights(7, NOW);
    expect(s.kpis[0].value).toBe(s.series.current.reduce((x, y) => x + y, 0));
  });
});

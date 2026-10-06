import { describe, expect, test } from "vitest";
import {
  activityLevel,
  areaPath,
  changePct,
  dayLabels,
  donutArcs,
  linePath,
  niceMax,
  ticks,
  weekdayLabels,
} from "./chart-math";

describe("changePct", () => {
  test("percent change against the previous period, 1 decimal", () => {
    expect(changePct(112.5, 100)).toBe(12.5);
    expect(changePct(50, 100)).toBe(-50);
    expect(changePct(10, 3)).toBe(233.3);
    expect(changePct(5, 5)).toBe(0);
  });
  test("null when there is nothing to compare with", () => {
    expect(changePct(10, 0)).toBeNull();
    expect(changePct(0, 0)).toBeNull();
  });
});

describe("niceMax and ticks", () => {
  test("a round axis top at or above the largest value", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-3)).toBe(1);
    expect(niceMax(1)).toBe(1);
    expect(niceMax(7)).toBe(8);
    expect(niceMax(13)).toBe(15);
    expect(niceMax(20)).toBe(20);
    expect(niceMax(2340)).toBe(2500);
    expect(niceMax(96_000)).toBe(100_000);
    expect(niceMax(0.42)).toBe(0.5);
  });
  test("evenly spaced ticks from 0 to the top, on round steps", () => {
    expect(ticks(8)).toEqual([0, 2, 4, 6, 8]);
    expect(ticks(20)).toEqual([0, 5, 10, 15, 20]);
    expect(ticks(15)).toEqual([0, 5, 10, 15]);
    expect(ticks(2500)).toEqual([0, 500, 1000, 1500, 2000, 2500]);
    expect(ticks(1)).toEqual([0, 0.5, 1]);
  });
});

describe("paths", () => {
  test("line: x spread evenly, y measured down from the top", () => {
    expect(linePath([0, 5, 10], 100, 50, 10)).toBe("M0 50 L50 25 L100 0");
  });
  test("a single value is drawn flat across", () => {
    expect(linePath([5], 100, 50, 10)).toBe("M0 25 L100 25");
  });
  test("area closes the line along the bottom", () => {
    expect(areaPath([0, 5, 10], 100, 50, 10)).toBe("M0 50 L50 25 L100 0 L100 50 L0 50 Z");
  });
  test("values above the top are clipped to the top", () => {
    expect(linePath([20, 0], 10, 10, 10)).toBe("M0 0 L10 10");
  });
  test("smooth: a curve through every point, ending where the line ends", () => {
    const d = linePath([0, 10, 0, 5], 30, 10, 10, true);
    expect(d.startsWith("M0 10 C")).toBe(true);
    expect(d.endsWith(" 30 5")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(3);
    // A peak is flat at the top: no overshoot above the chart.
    expect(d).toContain(" 10 0 C");
  });
  test("no values: an empty path", () => {
    expect(linePath([], 100, 50, 10)).toBe("");
    expect(areaPath([], 100, 50, 10)).toBe("");
  });
});

describe("donutArcs", () => {
  test("arcs and gaps add up to the whole circle", () => {
    const r = 40;
    const arcs = donutArcs([3, 1], r, 4);
    const c = 2 * Math.PI * r;
    expect(arcs).toHaveLength(2);
    expect(arcs[0].start).toBe(0);
    expect(arcs[0].length + 4).toBeCloseTo((c * 3) / 4);
    expect(arcs[1].start).toBeCloseTo((c * 3) / 4);
    expect(arcs.reduce((s, a) => s + a.length + 4, 0)).toBeCloseTo(c);
  });
  test("one value fills the circle without a gap; nothing gives no arcs", () => {
    const [only] = donutArcs([5], 10, 4);
    expect(only.length).toBeCloseTo(2 * Math.PI * 10);
    expect(donutArcs([0, 0], 10, 4)).toEqual([]);
  });
  test("zero values are skipped but keep their place", () => {
    const arcs = donutArcs([1, 0, 1], 10, 0);
    expect(arcs[1].length).toBe(0);
  });
});

describe("dates", () => {
  const start = Date.UTC(2026, 9, 1); // Thursday 1 Oct 2026
  test("short UTC dates per day", () => {
    expect(dayLabels(start, 3, "en")).toEqual(["Oct 1", "Oct 2", "Oct 3"]);
  });
  test("Arabic keeps Latin digits", () => {
    expect(dayLabels(start, 1, "ar")[0]).toMatch(/1/);
  });
  test("weekday names", () => {
    expect(weekdayLabels(start, 2, "en")).toEqual(["Thu", "Fri"]);
  });
});

describe("activityLevel", () => {
  test("0 for nothing, then 1..4 by share of the busiest day", () => {
    expect(activityLevel(0, 10)).toBe(0);
    expect(activityLevel(3, 0)).toBe(0);
    expect(activityLevel(1, 10)).toBe(1);
    expect(activityLevel(5, 10)).toBe(2);
    expect(activityLevel(7, 10)).toBe(3);
    expect(activityLevel(10, 10)).toBe(4);
  });
});

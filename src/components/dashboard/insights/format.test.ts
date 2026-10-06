import { describe, expect, test } from "vitest";
import { activityStart, formatKpi, lowerIsBetter, shownKpis, unitOf } from "./format";

const DAY = 86_400_000;

describe("formatKpi", () => {
  test("dinars, kilograms, counts, rates and days", () => {
    expect(formatKpi("soldDzd", 30500.5, "en", "{n} days")).toBe("30,500.5 DA");
    expect(formatKpi("avgDzdPerKg", 15, "ar", "{n} يوم")).toBe("15 دج");
    expect(formatKpi("boughtKg", 2000, "en", "{n} days")).toBe("2,000 kg");
    expect(formatKpi("sales", 1234, "en", "{n} days")).toBe("1,234");
    expect(formatKpi("acceptRate", 0.333, "en", "{n} days")).toBe("33%");
    expect(formatKpi("avgTurnaroundDays", 2.25, "en", "{n} days")).toBe("2.3 days");
  });
  test("units by key", () => {
    expect(unitOf("revenueDzd")).toBe("dzd");
    expect(unitOf("soldKg")).toBe("kg");
    expect(unitOf("requests")).toBe("count");
  });
});

describe("which KPIs and how to read them", () => {
  test("factories show four tiles: acceptance rides along as a caption", () => {
    const keys = ["spentDzd", "boughtKg", "offersSent", "acceptRate", "avgDzdPerKg"].map((key) => ({ key, value: 1, previous: 1, spark: [] }));
    expect(shownKpis(keys).map((k) => k.key)).toEqual(["spentDzd", "boughtKg", "offersSent", "avgDzdPerKg"]);
  });
  test("slower turnaround and dearer purchases are bad news", () => {
    expect(lowerIsBetter("lab", "avgTurnaroundDays")).toBe(true);
    expect(lowerIsBetter("factory", "avgDzdPerKg")).toBe(true);
    expect(lowerIsBetter("farm", "avgDzdPerKg")).toBe(false);
    expect(lowerIsBetter("farm", "soldDzd")).toBe(false);
  });
  test("the activity grid starts 139 days before today", () => {
    const start = Date.UTC(2026, 9, 1);
    expect(activityStart({ start, days: 7 })).toBe(start + 6 * DAY - 139 * DAY);
  });
});

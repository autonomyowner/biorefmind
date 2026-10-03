import { describe, expect, test } from "vitest";
import { addMonths, extendBase, LAB_PRICE_DZD, LAB_PRICE_USD, toDzd, USD_TO_DZD } from "./pricing";

describe("lab price", () => {
  test("$100 a month is 25,000 DA at 250 DA per dollar", () => {
    expect(LAB_PRICE_USD).toBe(100);
    expect(USD_TO_DZD).toBe(250);
    expect(LAB_PRICE_DZD).toBe(25_000);
    expect(toDzd(3)).toBe(750);
  });
});

describe("addMonths", () => {
  test("calendar months, end of month clamps to the last day", () => {
    expect(addMonths(Date.UTC(2026, 0, 15, 12), 1)).toBe(Date.UTC(2026, 1, 15, 12));
    expect(addMonths(Date.UTC(2026, 0, 31, 12), 1)).toBe(Date.UTC(2026, 1, 28, 12));
    expect(addMonths(Date.UTC(2026, 10, 30), 3)).toBe(Date.UTC(2027, 1, 28));
    expect(addMonths(Date.UTC(2026, 5, 1), 12)).toBe(Date.UTC(2027, 5, 1));
  });
});

describe("extendBase", () => {
  const NOW = Date.UTC(2026, 9, 3);
  test("later of now and the current end (trial or paid)", () => {
    expect(extendBase({ plan: "lab_trial", trialEndsAt: NOW + 5 }, NOW)).toBe(NOW + 5);
    expect(extendBase({ plan: "lab_trial", trialEndsAt: NOW - 5 }, NOW)).toBe(NOW);
    expect(extendBase({ plan: "lab_paid", paidUntil: NOW + 9 }, NOW)).toBe(NOW + 9);
    expect(extendBase({ plan: "lab_paid", paidUntil: NOW - 9 }, NOW)).toBe(NOW);
    expect(extendBase({ plan: "lab_paid" }, NOW)).toBe(NOW);
  });
});

import { describe, expect, test } from "vitest";
import { cleanNote, cleanPrice, cleanQuantity, MARKET_REFUSE, offerFits, saleAmounts } from "./market";
import { MARKET_FEE_RATE } from "./pricing";

describe("cleanQuantity", () => {
  test("whole kilograms from 1 to 10,000,000", () => {
    expect(cleanQuantity(1)).toBe(1);
    expect(cleanQuantity(10_000_000)).toBe(10_000_000);
    for (const bad of [0, -5, 1.5, 10_000_001, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => cleanQuantity(bad)).toThrow(MARKET_REFUSE.quantity);
    }
  });
});

describe("cleanPrice", () => {
  test("0.01 to 100,000 DA per kg, kept to 2 decimals", () => {
    expect(cleanPrice(0.01)).toBe(0.01);
    expect(cleanPrice(100_000)).toBe(100_000);
    expect(cleanPrice(12.345)).toBe(12.35);
    for (const bad of [0, 0.004, -1, 100_000.01, Number.NaN]) {
      expect(() => cleanPrice(bad)).toThrow(MARKET_REFUSE.price);
    }
  });
});

describe("cleanNote", () => {
  test("trimmed, empty becomes undefined, over 1000 refused", () => {
    expect(cleanNote(undefined)).toBeUndefined();
    expect(cleanNote("   ")).toBeUndefined();
    expect(cleanNote("  dry, bagged  ")).toBe("dry, bagged");
    expect(cleanNote("x".repeat(1000))).toHaveLength(1000);
    expect(() => cleanNote("x".repeat(1001))).toThrow(MARKET_REFUSE.note);
  });
});

describe("saleAmounts", () => {
  test("total is quantity × price; buyer fee is 5% of it, to the dinar", () => {
    expect(MARKET_FEE_RATE).toBe(0.05);
    expect(saleAmounts(2000, 15)).toEqual({ totalDzd: 30_000, feeDzd: 1500 });
    expect(saleAmounts(333, 1.5)).toEqual({ totalDzd: 499.5, feeDzd: 25 });
    expect(saleAmounts(1, 0.01)).toEqual({ totalDzd: 0.01, feeDzd: 0 });
  });
});

describe("offerFits", () => {
  test("a pending offer fits while its quantity is at most what is left", () => {
    expect(offerFits({ quantityKg: 500 }, 500)).toBe(true);
    expect(offerFits({ quantityKg: 501 }, 500)).toBe(false);
    expect(offerFits({ quantityKg: 1 }, 0)).toBe(false);
  });
});

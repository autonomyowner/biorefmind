import { describe, expect, test } from "vitest";
import { formatDzd, formatKg, formatPrice, parseCurrency } from "./pricing";

describe("formatPrice", () => {
  test("dollars and dinars in English and Arabic (Latin digits, grouped)", () => {
    expect(formatPrice(100, "usd", "en")).toBe("$100");
    expect(formatPrice(100, "dzd", "en")).toBe("25,000 DA");
    expect(formatPrice(100, "usd", "ar")).toBe("100$");
    expect(formatPrice(100, "dzd", "ar")).toBe("25,000 دج");
    expect(formatPrice(1200, "usd", "en")).toBe("$1,200");
    expect(formatPrice(1200, "dzd", "en")).toBe("300,000 DA");
  });
});

describe("parseCurrency", () => {
  test("a saved choice wins, otherwise the language decides", () => {
    expect(parseCurrency("usd", "ar")).toBe("usd");
    expect(parseCurrency("dzd", "en")).toBe("dzd");
    expect(parseCurrency(null, "en")).toBe("usd");
    expect(parseCurrency("eur", "ar")).toBe("dzd");
  });
});

describe("formatDzd / formatKg", () => {
  test("dinars and kilograms, grouped, up to 2 decimals", () => {
    expect(formatDzd(30000, "en")).toBe("30,000 DA");
    expect(formatDzd(15.5, "ar")).toBe("15.5 دج");
    expect(formatDzd(499.5, "en")).toBe("499.5 DA");
    expect(formatKg(2000, "en")).toBe("2,000 kg");
    expect(formatKg(2000, "ar")).toBe("2,000 كغ");
  });
});

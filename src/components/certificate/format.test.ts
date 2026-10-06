import { describe, expect, it } from "vitest";

import { fill, formatDate, formatNumber, formatResult, hasConformity, normalizeCode, printPageCss } from "./format";

describe("certificate formatting", () => {
  it("prints large numbers with thousands separators and keeps decimals", () => {
    expect(formatNumber(120000)).toBe("120,000");
    expect(formatNumber(0.35)).toBe("0.35");
    expect(formatNumber(12.5)).toBe("12.5");
  });

  it("prints qualifiers", () => {
    expect(formatResult(10, "<", "Not detected")).toBe("< 10");
    expect(formatResult(5, ">", "Not detected")).toBe("> 5");
    expect(formatResult(0.01, "nd", "Not detected")).toBe("Not detected");
    expect(formatResult(25000, undefined, "Not detected")).toBe("25,000");
  });

  it("prints dates as YYYY-MM-DD in Algeria's time zone", () => {
    // 23:30 UTC on 5 Oct is already 6 Oct in Algiers (UTC+1).
    expect(formatDate(Date.UTC(2026, 9, 5, 23, 30))).toBe("2026-10-06");
  });

  it("finds conformity only when a line has a pass value", () => {
    expect(hasConformity({ panels: [] })).toBe(false);
    expect(hasConformity({ panels: [{ lines: [{}] }] })).toBe(false);
    expect(hasConformity({ panels: [{ lines: [{}, { pass: false }] }] })).toBe(true);
  });

  it("normalizes typed codes", () => {
    expect(normalizeCode("  k7m2-qx9t pa4r ")).toBe("K7M2QX9TPA4R");
  });

  it("fills slots", () => {
    expect(fill("Report {no}", { no: "S-2026-0001-R1" })).toBe("Report S-2026-0001-R1");
  });

  it("quotes the report number safely in the print CSS", () => {
    const css = printPageCss('Report "x"</style>', "Page", "of");
    expect(css).toContain('content:"Report \\"x\\"/style"');
    expect(css).toContain('counter(page) " of " counter(pages)');
    expect(css).not.toContain("<");
  });
});

import { describe, expect, it } from "vitest";

import { expiredWhy, inputToMs, pluralClass, todayInput } from "./format";

const DAY = 86_400_000;

describe("pluralClass", () => {
  it("follows the Arabic classes", () => {
    expect(pluralClass(1)).toBe("one");
    expect(pluralClass(2)).toBe("two");
    expect(pluralClass(3)).toBe("few");
    expect(pluralClass(10)).toBe("few");
    expect(pluralClass(11)).toBe("many");
    expect(pluralClass(90)).toBe("many");
  });
});

describe("date input", () => {
  it("formats today with zero padding", () => {
    expect(todayInput(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("reads a date as midday on that day, and refuses empty values", () => {
    const ms = inputToMs("2026-10-06");
    const d = new Date(ms);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 6, 12]);
    expect(inputToMs("")).toBeNaN();
    expect(inputToMs("06/10/2026")).toBeNaN();
  });
});

describe("expiredWhy", () => {
  it("an answered (accepted) request expired because the sample never came; otherwise the lab never answered", () => {
    expect(expiredWhy(undefined)).toBe("noAnswer");
    expect(expiredWhy(31 * DAY)).toBe("noSample");
  });
});

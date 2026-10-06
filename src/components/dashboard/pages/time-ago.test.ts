import { describe, expect, test } from "vitest";

import { timeAgo } from "./time-ago";

const NOW = Date.UTC(2026, 9, 6, 12);

describe("timeAgo", () => {
  test("English, by the largest whole unit", () => {
    expect(timeAgo(NOW - 20_000, NOW, "en")).toBe("now");
    expect(timeAgo(NOW - 5 * 60_000, NOW, "en")).toBe("5 minutes ago");
    expect(timeAgo(NOW - 2 * 3_600_000, NOW, "en")).toBe("2 hours ago");
    expect(timeAgo(NOW - 86_400_000, NOW, "en")).toBe("yesterday");
    expect(timeAgo(NOW - 3 * 86_400_000, NOW, "en")).toBe("3 days ago");
  });
  test("Arabic keeps Latin digits", () => {
    const text = timeAgo(NOW - 5 * 86_400_000, NOW, "ar");
    expect(text).toContain("5");
    expect(text).toMatch(/[؀-ۿ]/);
  });
  test("a time in the future reads as now", () => {
    expect(timeAgo(NOW + 60_000, NOW, "en")).toBe("now");
  });
});

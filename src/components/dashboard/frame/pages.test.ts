import { describe, expect, test } from "vitest";

import { PAGES, pageOfPath } from "./pages";

describe("pageOfPath", () => {
  test("the Overview is /dashboard exactly", () => {
    expect(pageOfPath("/dashboard")).toBe("overview");
    expect(pageOfPath("/dashboard/")).toBe("overview");
  });
  test("other pages match by prefix and ignore the query", () => {
    expect(pageOfPath("/dashboard/sales")).toBe("sales");
    expect(pageOfPath("/dashboard/labs?tab=find")).toBe("labs");
    expect(pageOfPath("/dashboard/listings/abc")).toBe("listings");
  });
  test("unknown or outside paths are null", () => {
    expect(pageOfPath("/dashboard/salesman")).toBeNull();
    expect(pageOfPath("/admin")).toBeNull();
  });
});

describe("PAGES", () => {
  test("every account starts on the Overview and ends with Settings", () => {
    for (const pages of Object.values(PAGES)) {
      expect(pages[0]).toBe("overview");
      expect(pages.at(-1)).toBe("settings");
    }
  });
});

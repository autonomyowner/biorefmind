import { describe, expect, test } from "vitest";

import { forwardHash } from "./forward-hash";
import type { DashPage } from "./links";

const FARM: DashPage[] = ["overview", "listings", "sales", "labs", "analytics", "settings"];
const FACTORY: DashPage[] = ["overview", "browse", "offers", "sales", "labs", "analytics", "settings"];
const LAB: DashPage[] = ["overview", "requests", "prices", "analytics", "plan", "settings"];

describe("forwardHash", () => {
  test("old one-page anchors open their page", () => {
    expect(forwardHash("#listings", FARM)).toBe("/dashboard/listings");
    expect(forwardHash("#sales", FARM)).toBe("/dashboard/sales");
    expect(forwardHash("#labtests", FARM)).toBe("/dashboard/labs");
    expect(forwardHash("#browse", FACTORY)).toBe("/dashboard/browse");
    expect(forwardHash("#offers", FACTORY)).toBe("/dashboard/offers");
    expect(forwardHash("#enterprise", FACTORY)).toBe("/dashboard/settings");
    expect(forwardHash("#requests", LAB)).toBe("/dashboard/requests");
    expect(forwardHash("#prices", LAB)).toBe("/dashboard/prices");
    expect(forwardHash("#profile", LAB)).toBe("/dashboard/settings");
    expect(forwardHash("#plan", LAB)).toBe("/dashboard/plan");
  });

  test("#labs opens the Find a lab tab", () => {
    expect(forwardHash("#labs", FACTORY)).toBe("/dashboard/labs?tab=find");
  });

  test("works without the leading #", () => {
    expect(forwardHash("sales", FACTORY)).toBe("/dashboard/sales");
  });

  test("only pages the account has", () => {
    expect(forwardHash("#listings", LAB)).toBeNull();
    expect(forwardHash("#requests", FARM)).toBeNull();
    expect(forwardHash("#labs", LAB)).toBeNull();
  });

  test("no hash, #top or an unknown hash stays on the Overview", () => {
    expect(forwardHash("", FARM)).toBeNull();
    expect(forwardHash("#", FARM)).toBeNull();
    expect(forwardHash("#top", FARM)).toBeNull();
    expect(forwardHash("#nothing", FARM)).toBeNull();
  });
});

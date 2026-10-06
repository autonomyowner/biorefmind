import { describe, expect, test } from "vitest";
import { withGuest } from "./links";

describe("withGuest", () => {
  test("signed-in links stay as they are", () => {
    expect(withGuest("/dashboard/sales", false)).toBe("/dashboard/sales");
  });
  test("the guest preview keeps ?guest=1, before any hash", () => {
    expect(withGuest("/dashboard/sales", true)).toBe("/dashboard/sales?guest=1");
    expect(withGuest("/dashboard/labs?tab=find", true)).toBe("/dashboard/labs?tab=find&guest=1");
    expect(withGuest("/dashboard/listings#new", true)).toBe("/dashboard/listings?guest=1#new");
  });
});

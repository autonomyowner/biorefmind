import { describe, expect, test } from "vitest";
import { REFUSE } from "../../convex/lib/accounts";
import { AI_REFUSE } from "../../convex/lib/ai";
import { READ_REFUSE } from "../../convex/lib/aiRead";
import { ASSIST_REFUSE } from "../../convex/lib/assistant";
import { INSIGHTS_REFUSE } from "../../convex/lib/insights";
import { LAB_REFUSE } from "../../convex/lib/labwork";
import { MARKET_REFUSE } from "../../convex/lib/market";
import { localizeBackendError } from "./backend-errors";

describe("localizeBackendError", () => {
  test("every account, marketplace, lab-work and AI refusal has Arabic", () => {
    const missing = [...Object.values(REFUSE), ...Object.values(MARKET_REFUSE), ...Object.values(LAB_REFUSE), ...Object.values(INSIGHTS_REFUSE), ...Object.values(AI_REFUSE), ...Object.values(READ_REFUSE), ...Object.values(ASSIST_REFUSE)].filter(
      (m) => localizeBackendError(m, "ar") === m,
    );
    expect(missing).toEqual([]);
  });

  test("English stays as sent; unknown text stays English", () => {
    expect(localizeBackendError(MARKET_REFUSE.closed, "en")).toBe(MARKET_REFUSE.closed);
    expect(localizeBackendError("Something new", "ar")).toBe("Something new");
  });
});

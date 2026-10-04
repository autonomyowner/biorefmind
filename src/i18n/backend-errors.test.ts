import { describe, expect, test } from "vitest";
import { REFUSE } from "../../convex/lib/accounts";
import { MARKET_REFUSE } from "../../convex/lib/market";
import { localizeBackendError } from "./backend-errors";

describe("localizeBackendError", () => {
  test("every account and marketplace refusal has Arabic", () => {
    const missing = [...Object.values(REFUSE), ...Object.values(MARKET_REFUSE)].filter(
      (m) => localizeBackendError(m, "ar") === m,
    );
    expect(missing).toEqual([]);
  });

  test("English stays as sent; unknown text stays English", () => {
    expect(localizeBackendError(MARKET_REFUSE.closed, "en")).toBe(MARKET_REFUSE.closed);
    expect(localizeBackendError("Something new", "ar")).toBe("Something new");
  });
});

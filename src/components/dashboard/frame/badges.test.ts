import { describe, expect, test } from "vitest";

import type { LabQueueRow, MyListing } from "@/lib/types";
import { labWaitingCount, pendingOfferCount } from "./badges-count";

const offer = (status: string) => ({ status }) as MyListing["offers"][number];
const listing = (status: string, offers: string[]) => ({ status, offers: offers.map(offer) }) as unknown as MyListing;

describe("pendingOfferCount", () => {
  test("counts pending offers on open lots only", () => {
    expect(
      pendingOfferCount([
        listing("open", ["pending", "pending", "declined"]),
        listing("open", ["accepted", "pending"]),
        listing("sold", ["pending"]),
        listing("withdrawn", ["pending"]),
      ]),
    ).toBe(3);
  });
  test("nothing loaded yet → 0", () => {
    expect(pendingOfferCount(undefined)).toBe(0);
  });
});

describe("labWaitingCount", () => {
  test("requests to accept or to receive", () => {
    const rows = ["requested", "accepted", "received", "released", "expired", "requested"].map((status) => ({ status }) as LabQueueRow);
    expect(labWaitingCount(rows)).toBe(3);
    expect(labWaitingCount(undefined)).toBe(0);
  });
});

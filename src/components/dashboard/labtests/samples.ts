import type { Id } from "../../../../convex/_generated/dataModel";
import type { MyLabRequest } from "@/lib/types";

// What the guest preview (`?guest=1`, a farm in Sétif) shows instead of live lab requests.

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 4);
const LAB = "s1" as Id<"companies">;
const labContact = {
  labId: LAB,
  labName: "Labo Nour",
  labPhone: "+213 36 00 00 00",
  labAddress: "Cité 1000 logements, Bt 12, Sétif",
  labHours: "Sun–Thu 8:00–16:00",
};

export const SAMPLE_REQUESTS: MyLabRequest[] = [
  {
    ...labContact,
    requestId: "gr3" as Id<"labRequests">,
    status: "requested",
    analyses: [{ analysis: "moisture", priceDzd: 2_500, days: 2 }],
    totalDzd: 2_500,
    sample: { residue: "olive_pomace", label: "Pomace, press 2", state: "fresh", collectedAt: NOW - DAY, region: "Sétif", grams: 1_000 },
    delivery: "courier",
    tracking: "YAL-48213907",
    listingId: undefined,
    saleId: undefined,
    sampleNo: undefined,
    dueAt: undefined,
    reason: undefined,
    cancelledBy: undefined,
    reports: [],
    attached: false,
    createdAt: NOW - DAY,
  },
  {
    ...labContact,
    requestId: "gr2" as Id<"labRequests">,
    status: "received",
    analyses: [
      { analysis: "polyphenols", priceDzd: 6_000, days: 5 },
      { analysis: "mold", priceDzd: 3_500, days: 4 },
    ],
    totalDzd: 9_500,
    sample: { residue: "citrus_peels", label: "Orange peel, Oct", state: "dried", collectedAt: NOW - 6 * DAY, region: "Sétif", grams: 400 },
    delivery: "dropoff",
    tracking: undefined,
    listingId: undefined,
    saleId: undefined,
    sampleNo: "S-2026-0042",
    dueAt: NOW + 4 * DAY,
    reason: undefined,
    cancelledBy: undefined,
    reports: [],
    attached: false,
    createdAt: NOW - 5 * DAY,
  },
  {
    ...labContact,
    requestId: "gr1" as Id<"labRequests">,
    status: "released",
    analyses: [
      { analysis: "moisture", priceDzd: 2_500, days: 2 },
      { analysis: "punicalagin", priceDzd: 12_000, days: 7 },
      { analysis: "mold", priceDzd: 3_500, days: 4 },
    ],
    totalDzd: 18_000,
    sample: { residue: "pomegranate_peels", label: "Batch 3, sun-dried", state: "dried", collectedAt: NOW - 16 * DAY, region: "Sétif", grams: 500 },
    delivery: "dropoff",
    tracking: undefined,
    listingId: "g1" as Id<"listings">,
    saleId: undefined,
    sampleNo: "S-2026-0031",
    dueAt: NOW - 4 * DAY,
    reason: undefined,
    cancelledBy: undefined,
    reports: [{ code: "K7M2Q9XRT4HD", version: 1, reportNo: "S-2026-0031-R1", releasedAt: NOW - 5 * DAY, amendReason: undefined }],
    attached: false,
    createdAt: NOW - 15 * DAY,
  },
];

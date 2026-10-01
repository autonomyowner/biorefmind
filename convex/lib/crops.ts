/**
 * Crop definitions. Adding a crop is data only: a new entry here with its
 * fields, weights and thresholds; the scoring engine reads nothing else.
 *
 * Pomegranate-peel values are placeholders taken from the study's intent —
 * TO CALIBRATE WITH LAB DATA before any commercial use.
 */

export type LabKey = "moisture" | "mold" | "oxidation" | "punicalagin";
export type Lab = Partial<Record<LabKey, number>>;
export type RouteKey = "A" | "B" | "C";

/** A linear sub-score: 100 at `fullAt`, 0 at `zeroAt` (either direction), clamped. */
export type SubScore = { fullAt: number; zeroAt: number; weight: number };

export type CropConfig = {
  key: string;
  name: string;
  unit: "%";
  fields: { key: LabKey; label: string; hint: string }[];
  thresholds: {
    /** Any value above `max` sends the shipment to C, whatever its score. */
    gates: { field: LabKey; max: number }[];
    subScores: Partial<Record<LabKey, SubScore>>;
    /** Route A needs the score and every min/max below; a missing value fails its check. */
    routeA: { minScore: number; min: Partial<Record<LabKey, number>>; max: Partial<Record<LabKey, number>> };
    routeB: { minScore: number };
    /** Confidence margin factor: `min` at a route boundary, 1.0 at `fullAt` points away. */
    margin: { fullAt: number; min: number };
    /** Human names for the routes, used in reasons. */
    routeNames: Record<RouteKey, string>;
  };
};

export const CROPS: CropConfig[] = [
  {
    key: "pomegranate_peel",
    name: "Pomegranate peel",
    unit: "%",
    fields: [
      { key: "moisture", label: "Moisture", hint: "Water content by weight. Dry peel is 10 % or less." },
      { key: "mold", label: "Mold", hint: "Visible or tested mold contamination. Above 5 % is rejected." },
      { key: "oxidation", label: "Oxidation", hint: "Browning / oxidation level. Fresh peel is 10 % or less." },
      {
        key: "punicalagin",
        label: "Punicalagin",
        hint: "Active compound content. 10 % or more qualifies for pharmaceutical use.",
      },
    ],
    thresholds: {
      gates: [
        { field: "mold", max: 5 },
        { field: "moisture", max: 20 },
      ],
      subScores: {
        punicalagin: { zeroAt: 2, fullAt: 15, weight: 0.4 },
        moisture: { fullAt: 10, zeroAt: 20, weight: 0.2 },
        mold: { fullAt: 0, zeroAt: 5, weight: 0.25 },
        oxidation: { fullAt: 10, zeroAt: 60, weight: 0.15 },
      },
      routeA: { minScore: 75, min: { punicalagin: 10 }, max: { mold: 1 } },
      routeB: { minScore: 50 },
      margin: { fullAt: 10, min: 0.6 },
      routeNames: {
        A: "pharmaceutical extraction",
        B: "food-grade pectin, oils and bio-packaging",
        C: "paper, fermentation and feed",
      },
    },
  },
];

export function getCrop(key: string): CropConfig | undefined {
  return CROPS.find((c) => c.key === key);
}

import { ConvexError } from "convex/values";
import { getCrop, type Lab, type LabKey, type RouteKey, type SubScore } from "./crops";

export type ScoreResult = { score: number; confidence: number; route: RouteKey; reasons: string[] };

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;
/** "12.4", "8", "0.25" — no trailing zeros. */
export const fmt = (n: number) => String(round(n, 2));

function subScore(value: number, s: SubScore): number {
  const t = (value - s.zeroAt) / (s.fullAt - s.zeroAt);
  return Math.min(1, Math.max(0, t)) * 100;
}

/**
 * Scores one shipment from its lab values. Pure and deterministic; every
 * number it uses comes from the crop's config in `crops.ts`.
 */
export function scoreShipment(cropKey: string, lab: Lab): ScoreResult {
  const crop = getCrop(cropKey);
  if (!crop) throw new ConvexError("Unknown crop.");
  const th = crop.thresholds;
  const label = (k: LabKey) => crop.fields.find((f) => f.key === k)?.label ?? k;

  const present = crop.fields.filter((f) => typeof lab[f.key] === "number");
  if (present.length === 0) {
    return { score: 0, confidence: 0.2, route: "C", reasons: ["No lab values entered — routed to C until tested."] };
  }

  // Weighted mean of the sub-scores we have, weights re-normalised.
  let sum = 0;
  let weights = 0;
  for (const f of present) {
    const s = th.subScores[f.key];
    if (!s) continue;
    sum += subScore(lab[f.key]!, s) * s.weight;
    weights += s.weight;
  }
  const score = weights > 0 ? round(sum / weights, 1) : 0;

  const reasons: string[] = [];
  const gates = th.gates.filter((g) => typeof lab[g.field] === "number" && lab[g.field]! > g.max);
  for (const g of gates) {
    reasons.push(`${label(g.field)} ${fmt(lab[g.field]!)} % is above the ${fmt(g.max)} % safety limit — routed to C.`);
  }

  let route: RouteKey;
  if (gates.length > 0) {
    route = "C";
  } else {
    let aOk = score >= th.routeA.minScore;
    for (const [k, min] of Object.entries(th.routeA.min) as [LabKey, number][]) {
      const v = lab[k];
      if (v === undefined) {
        aOk = false;
        reasons.push(`${label(k)} not tested — needed for the pharmaceutical route (≥ ${fmt(min)} %).`);
      } else if (v >= min) {
        reasons.push(`${label(k)} ${fmt(v)} % meets the pharmaceutical threshold (≥ ${fmt(min)} %).`);
      } else {
        aOk = false;
        reasons.push(`${label(k)} ${fmt(v)} % is below the pharmaceutical threshold (≥ ${fmt(min)} %).`);
      }
    }
    for (const [k, max] of Object.entries(th.routeA.max) as [LabKey, number][]) {
      const v = lab[k];
      if (v === undefined) {
        aOk = false;
        reasons.push(`${label(k)} not tested — needed for the pharmaceutical route (≤ ${fmt(max)} %).`);
      } else if (v <= max) {
        reasons.push(`${label(k)} ${fmt(v)} % is within the pharmaceutical limit (≤ ${fmt(max)} %).`);
      } else {
        aOk = false;
        reasons.push(`${label(k)} ${fmt(v)} % is above the pharmaceutical limit (≤ ${fmt(max)} %).`);
      }
    }
    if (score < th.routeA.minScore && score >= th.routeB.minScore) {
      reasons.push(`Quality score ${fmt(score)} is below the ${fmt(th.routeA.minScore)} needed for route A.`);
    }
    if (score < th.routeB.minScore) {
      reasons.push(`Quality score ${fmt(score)} is below the ${fmt(th.routeB.minScore)} needed for route B.`);
    }
    route = aOk ? "A" : score >= th.routeB.minScore ? "B" : "C";
  }

  const missing = crop.fields.filter((f) => typeof lab[f.key] !== "number");
  if (missing.length > 0) {
    reasons.push(`Not tested: ${missing.map((f) => f.label.toLowerCase()).join(", ")} — confidence reduced.`);
  }
  reasons.push(`Quality score ${fmt(score)} → route ${route} (${th.routeNames[route]}).`);

  const completeness = present.length / crop.fields.length;
  const distance = Math.min(Math.abs(score - th.routeA.minScore), Math.abs(score - th.routeB.minScore));
  const margin = th.margin.min + (1 - th.margin.min) * Math.min(1, distance / th.margin.fullAt);
  const confidence = round(completeness * margin, 2);

  return { score, confidence, route, reasons };
}

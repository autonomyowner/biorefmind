import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { Lab } from "./crops";
import { fmt } from "./scoring";

export const LAB_RANGE = "Lab values must be percentages between 0 and 100.";

/** Throws the contract refusal unless every present value is a finite 0–100 percentage. */
export function validateLab(lab: Lab): void {
  for (const v of Object.values(lab)) {
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) throw new ConvexError(LAB_RANGE);
  }
}

/** The contract's ShipmentRow. */
export async function toRow(ctx: QueryCtx, s: Doc<"shipments">) {
  return {
    _id: s._id,
    code: s.code,
    crop: s.crop,
    supplier: s.supplier,
    weightKg: s.weightKg,
    receivedAt: s.receivedAt,
    score: s.score,
    confidence: s.confidence,
    route: s.route,
    autoRoute: s.autoRoute,
    overridden: s.overridden,
    thumbUrl: s.photoIds.length > 0 ? await ctx.storage.getUrl(s.photoIds[0]) : null,
  };
}

/** 2–4 plain-English next steps from the current route and the lab values. */
export function recommendations(route: "A" | "B" | "C", lab: Lab): string[] {
  const out: string[] = [];
  if (route === "A") out.push("Send to pharmaceutical extraction within 48 hours to protect punicalagin content.");
  if (route === "B") out.push("Suitable for food-grade pectin, oils or bio-packaging processing.");
  if (route === "C") out.push("Use for paper, fermentation or animal feed — not for food or pharmaceutical lines.");

  if (lab.moisture !== undefined && lab.moisture > 12) {
    out.push(`Moisture is ${fmt(lab.moisture)} %: dry below 10 % before storage to stop mold growth.`);
  }
  if (lab.mold !== undefined && lab.mold > 1) {
    out.push(`Mold is ${fmt(lab.mold)} %: keep this lot apart from clean stock and check the supplier's storage.`);
  }
  if (lab.oxidation !== undefined && lab.oxidation > 30) {
    out.push(`Oxidation is ${fmt(lab.oxidation)} %: shorten the time between peeling and drying.`);
  }
  if (
    route !== "A" &&
    lab.punicalagin !== undefined &&
    lab.punicalagin >= 10 &&
    (lab.mold ?? 0) <= 1
  ) {
    out.push("Punicalagin is high enough for route A: fix the other factors and re-test to upgrade this lot.");
  }
  const missing = (["moisture", "mold", "oxidation", "punicalagin"] as const).filter((k) => lab[k] === undefined);
  if (missing.length > 0) out.push(`Test ${missing.join(", ")} to raise the confidence of this decision.`);
  if (out.length < 2) out.push("Store in a cool, dry, ventilated place and record any change in condition.");
  return out.slice(0, 4);
}

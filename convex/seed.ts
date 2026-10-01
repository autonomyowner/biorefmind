import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireMember } from "./lib/access";
import type { Lab } from "./lib/crops";
import { insertShipment } from "./shipments";

const DAY = 24 * 60 * 60 * 1000;

/** Supplier profiles: typical lab values, so each supplier has a recognisable quality. */
const SUPPLIERS: { name: string; origin: string; lab: Required<Lab> }[] = [
  { name: "Gabès Fruit Co.", origin: "Gabès, Tunisia", lab: { moisture: 9, mold: 0.4, oxidation: 12, punicalagin: 13 } },
  { name: "Kabylie Agro", origin: "Tizi Ouzou, Algeria", lab: { moisture: 11, mold: 0.8, oxidation: 18, punicalagin: 11 } },
  { name: "Mitidja Juices", origin: "Blida, Algeria", lab: { moisture: 13, mold: 1.5, oxidation: 25, punicalagin: 8 } },
  { name: "Oasis Pomegranates", origin: "Biskra, Algeria", lab: { moisture: 10, mold: 0.6, oxidation: 15, punicalagin: 12 } },
  { name: "Souss Valley Farms", origin: "Agadir, Morocco", lab: { moisture: 15, mold: 2.5, oxidation: 35, punicalagin: 6 } },
  { name: "Delta Press", origin: "Beheira, Egypt", lab: { moisture: 17, mold: 3.5, oxidation: 45, punicalagin: 4 } },
];

const OVERRIDE_REASONS = [
  "Visual check shows dry, clean peel — lab sample was taken from the wet corner.",
  "Customer contract requires food-grade lots only this week.",
  "Re-test pending: holding on a lower route until results arrive.",
];

/** Small deterministic generator so the demo looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const demoData = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const { user, company } = await requireMember(ctx, companyId, "owner", "Only the workspace owner can add demo data.");
    const rand = rng(42);
    const jitter = (base: number, spread: number) =>
      Math.min(100, Math.max(0, Math.round((base + (rand() * 2 - 1) * spread) * 10) / 10));
    const now = Date.now();
    let created = 0;

    for (let i = 0; i < 40; i++) {
      const sup = SUPPLIERS[i % SUPPLIERS.length];
      const lab: Lab = {
        moisture: jitter(sup.lab.moisture, 3),
        mold: jitter(sup.lab.mold, 1),
        oxidation: jitter(sup.lab.oxidation, 8),
        punicalagin: jitter(sup.lab.punicalagin, 3),
      };
      // A few lots were never fully tested.
      if (i % 11 === 5) delete lab.oxidation;
      const { shipmentId, result } = await insertShipment(ctx, company, user._id, {
        crop: "pomegranate_peel",
        supplier: sup.name,
        origin: sup.origin,
        weightKg: Math.round(500 + rand() * 4500),
        // Oldest first, so codes follow the dates.
        receivedAt: now - Math.floor(((39 - i) / 40) * 29 * DAY + rand() * DAY * 0.8),
        photoIds: [],
        lab,
      });
      created++;

      if (i % 9 === 4) {
        const to = result.route === "A" ? "B" : result.route === "B" ? "C" : "B";
        await ctx.db.insert("routeOverrides", {
          companyId,
          shipmentId,
          from: result.route,
          to,
          reason: OVERRIDE_REASONS[i % OVERRIDE_REASONS.length],
          userId: user._id,
          createdAt: now,
        });
        await ctx.db.patch(shipmentId, { route: to, overridden: true });
      }
    }
    return { created };
  },
});

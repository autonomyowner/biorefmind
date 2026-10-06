import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { labPrice } from "./schema";
import { requireMember, requireUser } from "./lib/access";
import { labListed } from "./lib/accounts";
import { cleanPrices, LAB_REFUSE, normalizeServices, optionalText } from "./lib/labwork";

/** Labs open to work: trial running or paid. Signed-in users only (phone numbers and prices are shown). */
export const directory = query({
  args: { service: v.optional(v.string()) },
  handler: async (ctx, { service }) => {
    await requireUser(ctx);
    const now = Date.now();
    const labs = await ctx.db
      .query("companies")
      .withIndex("by_kind", (q) => q.eq("kind", "lab"))
      .collect();
    return labs
      .map((c) => ({ c, services: normalizeServices(c.services) as string[] }))
      .filter(({ c, services }) => labListed(c, now) && (!service || services.includes(service)))
      .sort((a, b) => b.c.createdAt - a.c.createdAt)
      .slice(0, 100)
      .map(({ c, services }) => ({
        companyId: c._id,
        name: c.name,
        region: c.region ?? "",
        phone: c.phone ?? "",
        services,
        address: c.address ?? "",
        hours: c.hours ?? "",
        paused: c.paused ?? false,
        prices: c.prices ?? [],
      }));
  },
});

/** The lab's working details and price list (owners and managers). */
export const updateSettings = mutation({
  args: {
    companyId: v.id("companies"),
    address: v.string(),
    hours: v.string(),
    retention: v.string(),
    paused: v.boolean(),
    prices: v.array(labPrice),
  },
  handler: async (ctx, args) => {
    const { company } = await requireMember(ctx, args.companyId, "manager", LAB_REFUSE.role);
    if (company.kind !== "lab") throw new ConvexError(LAB_REFUSE.notLab);
    await ctx.db.patch(company._id, {
      address: optionalText(args.address, 200, LAB_REFUSE.address),
      hours: optionalText(args.hours, 120, LAB_REFUSE.hours),
      retention: optionalText(args.retention, 80, LAB_REFUSE.retention),
      paused: args.paused,
      prices: cleanPrices(args.prices, normalizeServices(company.services)),
    });
    return null;
  },
});

import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/access";
import { labListed } from "./lib/accounts";

/** Labs open to work: trial running or paid. Signed-in users only (phone numbers are shown). */
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
      .filter((c) => labListed(c, now) && (!service || (c.services ?? []).includes(service)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100)
      .map((c) => ({
        companyId: c._id,
        name: c.name,
        region: c.region ?? "",
        phone: c.phone ?? "",
        services: c.services ?? [],
      }));
  },
});

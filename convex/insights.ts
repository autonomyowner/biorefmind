import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireMember } from "./lib/access";
import { cleanDays, factoryInsights, farmInsights, labInsights, type Insights } from "./lib/insights";

// Design and contract: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §7

/** Company names, each looked up once. */
function namer(ctx: QueryCtx) {
  const cache = new Map<Id<"companies">, Promise<string>>();
  return (id: Id<"companies">) => {
    if (!cache.has(id)) cache.set(id, ctx.db.get(id).then((c) => c?.name ?? ""));
    return cache.get(id)!;
  };
}

/** The Analytics page and the Overview charts: this period against the previous one. Any member may read. */
export const workspace = query({
  args: { companyId: v.id("companies"), days: v.number() },
  handler: async (ctx, { companyId, days }): Promise<Insights> => {
    const { company } = await requireMember(ctx, companyId);
    cleanDays(days);
    const now = Date.now();
    const name = namer(ctx);

    if (company.kind === "farm") {
      const [sales, listings] = await Promise.all([
        ctx.db.query("sales").withIndex("by_seller", (q) => q.eq("sellerId", companyId)).collect(),
        ctx.db.query("listings").withIndex("by_company", (q) => q.eq("companyId", companyId)).collect(),
      ]);
      return farmInsights({
        now,
        days,
        sales: await Promise.all(sales.map(async (s) => ({ ...s, buyerName: await name(s.buyerId) }))),
        listings,
      });
    }

    if (company.kind === "factory") {
      const [sales, offers] = await Promise.all([
        ctx.db.query("sales").withIndex("by_buyer", (q) => q.eq("buyerId", companyId)).collect(),
        ctx.db.query("offers").withIndex("by_buyer", (q) => q.eq("buyerId", companyId)).collect(),
      ]);
      return factoryInsights({
        now,
        days,
        sales: await Promise.all(sales.map(async (s) => ({ ...s, sellerName: await name(s.sellerId) }))),
        offers,
      });
    }

    const requests = await ctx.db
      .query("labRequests")
      .withIndex("by_lab", (q) => q.eq("labId", companyId))
      .collect();
    return labInsights({
      now,
      days,
      requests: await Promise.all(
        requests.map(async (r) => ({
          ...r,
          analyses: r.analyses.map((a) => a.analysis),
          clientName: await name(r.clientId),
        })),
      ),
    });
  },
});

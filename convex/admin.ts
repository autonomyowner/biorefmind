import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/access";
import { isAdmin, labListed, REFUSE } from "./lib/accounts";
import { addMonths, extendBase } from "./lib/pricing";

/** The signed-in profile if its email is in ADMIN_EMAILS, otherwise the admin refusal. */
async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (!isAdmin(user.email)) throw new ConvexError(REFUSE.admin);
  return user;
}

/** Every account (newest first, up to 500) and the latest enterprise requests. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const companies = await ctx.db.query("companies").order("desc").take(500);
    const accounts = [];
    for (const c of companies) {
      const owner = await ctx.db.get(c.ownerId);
      accounts.push({
        companyId: c._id,
        name: c.name,
        kind: c.kind,
        ownerEmail: owner?.email ?? "",
        region: c.region ?? "",
        phone: c.phone ?? "",
        plan: c.plan,
        trialEndsAt: c.trialEndsAt,
        paidUntil: c.paidUntil,
        listed: c.kind === "lab" ? labListed(c, now) : undefined,
        createdAt: c.createdAt,
      });
    }
    const rows = await ctx.db.query("enterpriseRequests").withIndex("by_created").order("desc").take(100);
    const requests = [];
    for (const r of rows) {
      const [company, user] = await Promise.all([ctx.db.get(r.companyId), ctx.db.get(r.userId)]);
      requests.push({
        _id: r._id,
        company: company?.name ?? "",
        email: user?.email ?? "",
        phone: company?.phone ?? "",
        message: r.message,
        createdAt: r.createdAt,
      });
    }
    return { accounts, requests };
  },
});

/** Marks a lab as paid until a date (it is listed again until then). A past date hides it. */
export const setLabPaidUntil = mutation({
  args: { companyId: v.id("companies"), paidUntil: v.number() },
  handler: async (ctx, { companyId, paidUntil }) => {
    await requireAdmin(ctx);
    const company = await ctx.db.get(companyId);
    if (!company || company.kind !== "lab") throw new ConvexError(REFUSE.notLab);
    await ctx.db.patch(companyId, { plan: "lab_paid", paidUntil });
    return null;
  },
});

/** Records a payment of whole months: the paid period runs from the later of now and the current end. */
export const extendLab = mutation({
  args: { companyId: v.id("companies"), months: v.number() },
  handler: async (ctx, { companyId, months }) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(months) || months < 1 || months > 12) throw new ConvexError(REFUSE.months);
    const company = await ctx.db.get(companyId);
    if (!company || company.kind !== "lab") throw new ConvexError(REFUSE.notLab);
    const paidUntil = addMonths(extendBase(company, Date.now()), months);
    await ctx.db.patch(companyId, { plan: "lab_paid", paidUntil });
    return { paidUntil };
  },
});

/** Ends a lab's plan now: it leaves the directory until it is extended again. */
export const endLabPlan = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireAdmin(ctx);
    const company = await ctx.db.get(companyId);
    if (!company || company.kind !== "lab") throw new ConvexError(REFUSE.notLab);
    await ctx.db.patch(companyId, { plan: "lab_paid", paidUntil: Date.now() });
    return null;
  },
});

/** Every marketplace sale: totals, the fees buyers owe BiorefMind, and the latest 50. */
export const sales = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("sales").withIndex("by_created").order("desc").collect();
    const recent = [];
    for (const s of rows.slice(0, 50)) {
      const [seller, buyer] = await Promise.all([ctx.db.get(s.sellerId), ctx.db.get(s.buyerId)]);
      recent.push({
        saleId: s._id,
        residue: s.residue,
        residueName: s.residueName,
        quantityKg: s.quantityKg,
        totalDzd: s.totalDzd,
        feeDzd: s.feeDzd,
        seller: seller?.name ?? "",
        buyer: buyer?.name ?? "",
        createdAt: s.createdAt,
      });
    }
    return {
      count: rows.length,
      totalDzd: Math.round(rows.reduce((sum, s) => sum + s.totalDzd, 0) * 100) / 100,
      feeDzd: rows.reduce((sum, s) => sum + s.feeDzd, 0),
      recent,
    };
  },
});

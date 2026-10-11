import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/access";
import { isAdmin, labListed, REFUSE } from "./lib/accounts";
import { cleanText, INQUIRY_REFUSE } from "./lib/inquiries";
import { MARKET_REFUSE } from "./lib/market";
import { effectiveStatus } from "./lib/labwork";
import { addMonths, extendBase } from "./lib/pricing";

/** The signed-in profile if its email is in ADMIN_EMAILS, otherwise the admin refusal. */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (!isAdmin(user.email)) throw new ConvexError(REFUSE.admin);
  return user;
}

/** Records an admin action for the Activity list. */
export async function logAdmin(ctx: MutationCtx, user: Doc<"users">, action: string, detail: string) {
  await ctx.db.insert("adminLog", { userId: user._id, email: user.email, action, detail: detail.slice(0, 500), createdAt: Date.now() });
}

/** Every account (newest first, up to 500), the latest enterprise requests, and live counts. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const companies = await ctx.db.query("companies").order("desc").take(501);
    const accounts = [];
    for (const c of companies) {
      if (c.house || accounts.length >= 500) continue; // BiorefMind's own lots, not an account
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
    const openLots = (
      await ctx.db
        .query("listings")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .collect()
    ).length;
    const newInquiries = (
      await ctx.db
        .query("inquiries")
        .withIndex("by_status", (q) => q.eq("status", "new"))
        .collect()
    ).length;
    return { accounts, requests, stats: { openLots, newInquiries } };
  },
});

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Marks a lab as paid until a date (it is listed again until then). A past date hides it. */
export const setLabPaidUntil = mutation({
  args: { companyId: v.id("companies"), paidUntil: v.number() },
  handler: async (ctx, { companyId, paidUntil }) => {
    const user = await requireAdmin(ctx);
    const company = await ctx.db.get(companyId);
    if (!company || company.kind !== "lab") throw new ConvexError(REFUSE.notLab);
    await ctx.db.patch(companyId, { plan: "lab_paid", paidUntil });
    await logAdmin(ctx, user, "lab.paid_until", `${company.name}: paid until ${day(paidUntil)}`);
    return null;
  },
});

/** Records a payment of whole months: the paid period runs from the later of now and the current end. */
export const extendLab = mutation({
  args: { companyId: v.id("companies"), months: v.number() },
  handler: async (ctx, { companyId, months }) => {
    const user = await requireAdmin(ctx);
    if (!Number.isInteger(months) || months < 1 || months > 12) throw new ConvexError(REFUSE.months);
    const company = await ctx.db.get(companyId);
    if (!company || company.kind !== "lab") throw new ConvexError(REFUSE.notLab);
    const paidUntil = addMonths(extendBase(company, Date.now()), months);
    await ctx.db.patch(companyId, { plan: "lab_paid", paidUntil });
    await logAdmin(ctx, user, "lab.extend", `${company.name}: +${months} month(s), paid until ${day(paidUntil)}`);
    return { paidUntil };
  },
});

/** Ends a lab's plan now: it leaves the directory until it is extended again. */
export const endLabPlan = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const user = await requireAdmin(ctx);
    const company = await ctx.db.get(companyId);
    if (!company || company.kind !== "lab") throw new ConvexError(REFUSE.notLab);
    await ctx.db.patch(companyId, { plan: "lab_paid", paidUntil: Date.now() });
    await logAdmin(ctx, user, "lab.end", `${company.name}: plan ended`);
    return null;
  },
});

/**
 * Every marketplace sale: totals, the fees buyers owe BiorefMind, and the latest 50 with both phones
 * (only BiorefMind sees them; it puts the two sides in touch).
 */
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
        category: s.category ?? "residue",
        residue: s.residue,
        residueName: s.residueName,
        quantityKg: s.quantityKg,
        totalDzd: s.totalDzd,
        feeDzd: s.feeDzd,
        sellerFeeDzd: s.sellerFeeDzd ?? 0,
        seller: seller?.name ?? "",
        sellerPhone: seller?.phone ?? "",
        buyer: buyer?.name ?? "",
        buyerPhone: buyer?.phone ?? "",
        createdAt: s.createdAt,
      });
    }
    return {
      count: rows.length,
      totalDzd: Math.round(rows.reduce((sum, s) => sum + s.totalDzd, 0) * 100) / 100,
      feeDzd: rows.reduce((sum, s) => sum + s.feeDzd, 0),
      sellerFeeDzd: rows.reduce((sum, s) => sum + (s.sellerFeeDzd ?? 0), 0),
      recent,
    };
  },
});

/** Every open lot (newest first, up to 300) with the real seller and phone, for moderation. */
export const openLots = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(300);
    const out = [];
    for (const l of rows) {
      const seller = await ctx.db.get(l.companyId);
      const offers = await ctx.db
        .query("offers")
        .withIndex("by_listing", (q) => q.eq("listingId", l._id))
        .collect();
      const photo = l.photoIds[0] ? await ctx.storage.getUrl(l.photoIds[0]) : null;
      out.push({
        listingId: l._id,
        category: l.category ?? "residue",
        residue: l.residue,
        residueName: l.residueName,
        remainingKg: l.remainingKg,
        priceDzdPerKg: l.priceDzdPerKg,
        region: l.region,
        note: l.note,
        photoUrl: photo ?? undefined,
        managed: Boolean(l.managed),
        partnerNo: l.partnerNo,
        seller: l.managed?.farmerName ?? seller?.name ?? "",
        sellerPhone: l.managed ? (l.managed.farmerPhone ?? "") : (seller?.phone ?? ""),
        pendingOffers: offers.filter((o) => o.status === "pending").length,
        createdAt: l.createdAt,
      });
    }
    return out;
  },
});

/** Takes any open lot down (spam, wrong product, abuse). Pending offers are declined; the farm sees the reason. */
export const withdrawLot = mutation({
  args: { listingId: v.id("listings"), reason: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const reason = cleanText(args.reason, 2, 300, INQUIRY_REFUSE.reason);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    if (listing.status !== "open") throw new ConvexError(MARKET_REFUSE.closed);
    await ctx.db.patch(listing._id, { status: "withdrawn", withdrawnReason: reason });
    const now = Date.now();
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
      .collect();
    for (const o of offers) if (o.status === "pending") await ctx.db.patch(o._id, { status: "declined", respondedAt: now });
    const seller = await ctx.db.get(listing.companyId);
    const who = listing.managed?.farmerName ?? seller?.name ?? "";
    await logAdmin(ctx, user, "lot.moderated", `${who} · ${listing.residueName ?? listing.residue}: ${reason}`);
    return null;
  },
});

/** The latest 100 admin actions. */
export const activity = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("adminLog").withIndex("by_created").order("desc").take(100);
    return rows.map((r) => ({ logId: r._id, email: r.email, action: r.action, detail: r.detail, createdAt: r.createdAt }));
  },
});

/** The latest 50 lab requests with the lab's and the client's phones, so BiorefMind can put them in touch. */
export const labRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const rows = await ctx.db.query("labRequests").order("desc").take(50);
    const out = [];
    for (const r of rows) {
      const [lab, client] = await Promise.all([ctx.db.get(r.labId), ctx.db.get(r.clientId)]);
      out.push({
        requestId: r._id,
        lab: lab?.name ?? "",
        labPhone: lab?.phone ?? "",
        client: client?.name ?? "",
        clientKind: r.clientKind,
        clientPhone: client?.phone ?? "",
        clientRegion: client?.region ?? "",
        analyses: r.analyses.map((a) => a.analysis),
        status: effectiveStatus(r, now, lab !== null && labListed(lab, now)),
        totalDzd: r.totalDzd,
        createdAt: r.createdAt,
      });
    }
    return out;
  },
});

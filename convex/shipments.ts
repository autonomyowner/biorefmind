import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { findMembership, requireMember, requireUser } from "./lib/access";
import { getCrop } from "./lib/crops";
import { scoreShipment } from "./lib/scoring";
import { recommendations, toRow, validateLab } from "./lib/shipmentView";
import { labResults, route } from "./schema";

export const generateUploadUrl = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireMember(ctx, companyId);
    return await ctx.storage.generateUploadUrl();
  },
});

export type NewShipment = {
  crop: string;
  supplier: string;
  origin?: string;
  weightKg: number;
  receivedAt: number;
  photoIds: Id<"_storage">[];
  lab: Doc<"shipments">["lab"];
  notes?: string;
};

/** Validates, scores and inserts one shipment with the company's next code. Shared with the seed. */
export async function insertShipment(
  ctx: MutationCtx,
  company: Doc<"companies">,
  userId: Id<"users">,
  args: NewShipment,
) {
  if (!getCrop(args.crop)) throw new ConvexError("Unknown crop.");
  const supplier = args.supplier.trim();
  if (supplier.length < 1 || supplier.length > 120) throw new ConvexError("Please enter the supplier.");
  if (!Number.isFinite(args.weightKg) || args.weightKg <= 0) throw new ConvexError("Weight must be a positive number.");
  validateLab(args.lab);
  if (args.photoIds.length > 8) throw new ConvexError("You can attach up to 8 photos.");
  if (!Number.isFinite(args.receivedAt)) throw new ConvexError("Please enter the date received.");
  // Each photo must be a fresh upload: stored, and not yet attached to any shipment.
  for (const storageId of new Set(args.photoIds)) {
    const claimed = await ctx.db
      .query("photoClaims")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .first();
    if (claimed || !(await ctx.db.system.get(storageId))) {
      throw new ConvexError("One of the photos could not be found. Please upload it again.");
    }
    await ctx.db.insert("photoClaims", { storageId, companyId: company._id });
  }

  const result = scoreShipment(args.crop, args.lab);
  const seq = company.shipmentSeq + 1;
  const code = `BG-${String(seq).padStart(6, "0")}`;
  await ctx.db.patch(company._id, { shipmentSeq: seq });
  company.shipmentSeq = seq;

  const shipmentId = await ctx.db.insert("shipments", {
    companyId: company._id,
    code,
    crop: args.crop,
    supplier,
    origin: args.origin?.trim().slice(0, 120) || undefined,
    weightKg: args.weightKg,
    receivedAt: args.receivedAt,
    photoIds: args.photoIds,
    lab: args.lab,
    notes: args.notes?.trim().slice(0, 2000) || undefined,
    score: result.score,
    confidence: result.confidence,
    autoRoute: result.route,
    route: result.route,
    reasons: result.reasons,
    overridden: false,
    createdBy: userId,
    createdAt: Date.now(),
  });
  return { shipmentId, code, result };
}

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    crop: v.string(),
    supplier: v.string(),
    origin: v.optional(v.string()),
    weightKg: v.number(),
    receivedAt: v.number(),
    photoIds: v.array(v.id("_storage")),
    lab: labResults,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { companyId, ...args }) => {
    const { user, company } = await requireMember(ctx, companyId);
    return await insertShipment(ctx, company, user._id, args);
  },
});

export const list = query({
  args: {
    companyId: v.id("companies"),
    route: v.optional(route),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.companyId);
    const limit = Math.max(1, Math.min(500, Math.floor(Number.isFinite(args.limit) ? args.limit! : 100)));
    const needle = args.search?.trim().toLowerCase() ?? "";
    const out = [];
    const rows = ctx.db
      .query("shipments")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc");
    for await (const s of rows) {
      if (args.route && s.route !== args.route) continue;
      if (needle && !s.code.toLowerCase().includes(needle) && !s.supplier.toLowerCase().includes(needle)) continue;
      out.push(await toRow(ctx, s));
      if (out.length >= limit) break;
    }
    return out;
  },
});

export const get = query({
  args: { shipmentId: v.id("shipments") },
  handler: async (ctx, { shipmentId }) => {
    const user = await requireUser(ctx);
    const s = await ctx.db.get(shipmentId);
    if (!s || !(await findMembership(ctx, s.companyId, user._id))) return null;

    const creator = await ctx.db.get(s.createdBy);
    const overrideRows = await ctx.db
      .query("routeOverrides")
      .withIndex("by_shipment", (q) => q.eq("shipmentId", s._id))
      .collect();
    const overrides = [];
    for (const o of overrideRows) {
      const u = await ctx.db.get(o.userId);
      overrides.push({
        _id: o._id,
        from: o.from,
        to: o.to,
        reason: o.reason,
        userName: u?.name ?? "Unknown",
        createdAt: o.createdAt,
      });
    }
    const photoUrls: string[] = [];
    for (const id of s.photoIds) {
      const url = await ctx.storage.getUrl(id);
      if (url) photoUrls.push(url);
    }
    return {
      ...(await toRow(ctx, s)),
      origin: s.origin,
      notes: s.notes,
      lab: s.lab,
      reasons: s.reasons,
      photoUrls,
      createdByName: creator?.name ?? "Unknown",
      createdAt: s.createdAt,
      overrides,
      recommendations: recommendations(s.route, s.lab),
    };
  },
});

const NOT_FOUND = "This shipment no longer exists.";

/**
 * The shipment and the caller's membership of its company. A missing shipment
 * and another company's shipment get the same answer, as `get` returns null
 * for both, so ids reveal nothing to outsiders.
 */
async function shipmentForMember(ctx: MutationCtx, shipmentId: Id<"shipments">) {
  const user = await requireUser(ctx);
  const s = await ctx.db.get(shipmentId);
  if (!s || !(await findMembership(ctx, s.companyId, user._id))) throw new ConvexError(NOT_FOUND);
  return s;
}

export const override = mutation({
  args: { shipmentId: v.id("shipments"), to: route, reason: v.string() },
  handler: async (ctx, args) => {
    const s = await shipmentForMember(ctx, args.shipmentId);
    const { user } = await requireMember(ctx, s.companyId);
    const reason = args.reason.trim();
    if (reason.length < 5 || reason.length > 500) {
      throw new ConvexError("Please give a reason for the change (at least 5 characters).");
    }
    if (args.to === s.route) throw new ConvexError("The shipment is already on that route.");
    await ctx.db.insert("routeOverrides", {
      companyId: s.companyId,
      shipmentId: s._id,
      from: s.route,
      to: args.to,
      reason,
      userId: user._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch(s._id, { route: args.to, overridden: args.to !== s.autoRoute });
    return null;
  },
});

export const remove = mutation({
  args: { shipmentId: v.id("shipments") },
  handler: async (ctx, { shipmentId }) => {
    const s = await shipmentForMember(ctx, shipmentId);
    await requireMember(ctx, s.companyId, "manager", "Only owners and managers can delete shipments.");
    for (const id of s.photoIds) {
      if (await ctx.db.system.get(id)) await ctx.storage.delete(id);
      const claim = await ctx.db
        .query("photoClaims")
        .withIndex("by_storage", (q) => q.eq("storageId", id))
        .first();
      if (claim) await ctx.db.delete(claim._id);
    }
    const overrides = await ctx.db
      .query("routeOverrides")
      .withIndex("by_shipment", (q) => q.eq("shipmentId", s._id))
      .collect();
    for (const o of overrides) await ctx.db.delete(o._id);
    await ctx.db.delete(s._id);
    return null;
  },
});

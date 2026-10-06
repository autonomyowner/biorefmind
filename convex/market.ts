import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireMember, requireUser } from "./lib/access";
import { cleanRegion } from "./lib/accounts";
import {
  cleanNote,
  cleanPrice,
  cleanQuantity,
  cleanResidue,
  MARKET_REFUSE,
  maskPhones,
  MAX_LISTING_PHOTOS,
  offerFits,
  saleAmounts,
} from "./lib/market";
import { badgeVisible, LAB_REFUSE } from "./lib/labwork";
import { checkFor, farmerView, publicView, queuePhotoCheck } from "./photoCheck";

// Design and contract: docs/superpowers/specs/2026-10-04-marketplace-design.md

/** A farm member who may sell (owner or manager). */
async function requireSeller(ctx: QueryCtx | MutationCtx, companyId: Id<"companies">) {
  const m = await requireMember(ctx, companyId, "manager", MARKET_REFUSE.role);
  if (m.company.kind !== "farm") throw new ConvexError(MARKET_REFUSE.farmOnly);
  return m;
}

/** A factory member who may buy (owner or manager). */
async function requireBuyer(ctx: QueryCtx | MutationCtx, companyId: Id<"companies">) {
  const m = await requireMember(ctx, companyId, "manager", MARKET_REFUSE.role);
  if (m.company.kind !== "factory") throw new ConvexError(MARKET_REFUSE.factoryOnly);
  return m;
}

async function photoUrls(ctx: QueryCtx, ids: Id<"_storage">[]): Promise<string[]> {
  const urls = await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  return urls.filter((u): u is string => u !== null);
}

/** Turns every pending offer on a lot that `keep` rejects into a decline. */
async function declinePending(ctx: MutationCtx, listingId: Id<"listings">, keep: (o: Doc<"offers">) => boolean) {
  const now = Date.now();
  const offers = await ctx.db
    .query("offers")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .collect();
  for (const o of offers) {
    if (o.status === "pending" && !keep(o)) await ctx.db.patch(o._id, { status: "declined", respondedAt: now });
  }
}

export const generateUploadUrl = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireSeller(ctx, companyId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createListing = mutation({
  args: {
    companyId: v.id("companies"),
    residue: v.string(),
    residueName: v.optional(v.string()), // only with residue "other"
    quantityKg: v.number(),
    priceDzdPerKg: v.number(),
    region: v.optional(v.string()),
    note: v.optional(v.string()),
    photoIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { user, company } = await requireSeller(ctx, args.companyId);
    const { residue, residueName } = cleanResidue(args.residue, args.residueName);
    const quantityKg = cleanQuantity(args.quantityKg);
    const priceDzdPerKg = cleanPrice(args.priceDzdPerKg);
    const region = args.region?.trim() ? cleanRegion(args.region) : (company.region ?? "");
    const note = cleanNote(args.note);
    const photoIds = [...new Set(args.photoIds)];
    if (photoIds.length > MAX_LISTING_PHOTOS) throw new ConvexError(MARKET_REFUSE.photos);
    // Each photo must be a fresh upload (stored, not attached anywhere), or a photo this workspace sent to
    // its assistant (it then stops being an assistant photo, so deleting the chat keeps it).
    for (const storageId of photoIds) {
      const claimed = await ctx.db
        .query("photoClaims")
        .withIndex("by_storage", (q) => q.eq("storageId", storageId))
        .first();
      const fromAssistant = claimed?.source === "assistant" && claimed.companyId === company._id;
      if ((claimed && !fromAssistant) || !(await ctx.db.system.get(storageId))) throw new ConvexError(MARKET_REFUSE.photoMissing);
      if (fromAssistant) await ctx.db.replace(claimed._id, { storageId, companyId: company._id });
      else await ctx.db.insert("photoClaims", { storageId, companyId: company._id });
    }
    const listingId = await ctx.db.insert("listings", {
      companyId: company._id,
      residue,
      residueName,
      quantityKg,
      remainingKg: quantityKg,
      priceDzdPerKg,
      region,
      note,
      photoIds,
      status: "open",
      createdBy: user._id,
      createdAt: Date.now(),
    });
    if (photoIds.length > 0) await queuePhotoCheck(ctx, listingId, company._id);
    return listingId;
  },
});

export const withdrawListing = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    await requireSeller(ctx, listing.companyId);
    if (listing.status !== "open") throw new ConvexError(MARKET_REFUSE.closed);
    await ctx.db.patch(listingId, { status: "withdrawn" });
    await declinePending(ctx, listingId, () => false);
    return null;
  },
});

const STATUS_ORDER = { pending: 0, accepted: 1, declined: 2, withdrawn: 3 } as const;

/** The farm's lots, newest first, each with its offers (pending first). Any member may read. */
export const myListings = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireMember(ctx, companyId);
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .order("desc")
      .take(200);
    const out = [];
    for (const l of listings) {
      const rows = await ctx.db
        .query("offers")
        .withIndex("by_listing", (q) => q.eq("listingId", l._id))
        .collect();
      rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.createdAt - a.createdAt);
      const offers = [];
      for (const o of rows) {
        const buyer = await ctx.db.get(o.buyerId);
        offers.push({
          offerId: o._id,
          buyerName: buyer?.name ?? "",
          buyerRegion: buyer?.region ?? "",
          quantityKg: o.quantityKg,
          priceDzdPerKg: o.priceDzdPerKg,
          totalDzd: saleAmounts(o.quantityKg, o.priceDzdPerKg).totalDzd,
          message: maskPhones(o.message),
          status: o.status,
          createdAt: o.createdAt,
        });
      }
      out.push({
        listingId: l._id,
        residue: l.residue,
        residueName: l.residueName,
        quantityKg: l.quantityKg,
        remainingKg: l.remainingKg,
        priceDzdPerKg: l.priceDzdPerKg,
        region: l.region,
        note: l.note,
        status: l.status,
        photoUrls: await photoUrls(ctx, l.photoIds),
        labRequestId: l.labRequestId,
        photoCheck: farmerView(await checkFor(ctx, l._id), Date.now()),
        createdAt: l.createdAt,
        offers,
      });
    }
    return out;
  },
});

/**
 * The lab badge a lot shows while it is open and its attached results are under 90 days old.
 * The certificate code only for signed-in viewers.
 */
async function lotBadge(ctx: QueryCtx, l: Doc<"listings">, now: number, withCode: boolean) {
  if (!l.labRequestId) return undefined;
  const req = await ctx.db.get(l.labRequestId);
  const report = req?.reportId ? await ctx.db.get(req.reportId) : null;
  if (!report || !badgeVisible(l, report, now)) return undefined;
  return {
    labName: report.lab.name,
    releasedAt: report.releasedAt,
    score: report.score,
    route: report.route,
    ...(withCode ? { code: report.code } : {}),
  };
}

/** Open lots, newest first (up to 100), optionally of one residue. No contact details. */
export async function openLots(ctx: QueryCtx, residue: string | undefined, signedIn: boolean) {
  const now = Date.now();
  const open = await ctx.db
    .query("listings")
    .withIndex("by_status", (q) => q.eq("status", "open"))
    .order("desc")
    .take(residue ? 1000 : 100);
  const out = [];
  for (const l of open) {
    if (residue && l.residue !== residue) continue;
    const seller = await ctx.db.get(l.companyId);
    out.push({
      listingId: l._id,
      residue: l.residue,
      residueName: l.residueName,
      remainingKg: l.remainingKg,
      priceDzdPerKg: l.priceDzdPerKg,
      region: l.region,
      note: maskPhones(l.note),
      photoUrls: await photoUrls(ctx, l.photoIds),
      sellerName: seller?.name ?? "",
      lab: await lotBadge(ctx, l, now, signedIn),
      photoCheck: publicView(await checkFor(ctx, l._id)),
      createdAt: l.createdAt,
    });
    if (out.length >= 100) break;
  }
  return out;
}

/** Open lots for any signed-in account (the dashboard's Browse). */
export const browse = query({
  args: { residue: v.optional(v.string()) },
  handler: async (ctx, { residue }) => {
    await requireUser(ctx);
    return await openLots(ctx, residue, true);
  },
});

/** The same open lots for anyone, signed in or not (the public /marketplace page). */
export const publicLots = query({
  args: { residue: v.optional(v.string()) },
  handler: async (ctx, { residue }) => await openLots(ctx, residue, false),
});

/** The farm shows released lab results on its own lot (the request must be about that lot). */
export const attachLabReport = mutation({
  args: { listingId: v.id("listings"), requestId: v.id("labRequests") },
  handler: async (ctx, { listingId, requestId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    await requireSeller(ctx, listing.companyId);
    if (listing.status !== "open") throw new ConvexError(MARKET_REFUSE.closed);
    const req = await ctx.db.get(requestId);
    if (!req) throw new ConvexError(LAB_REFUSE.noRequest);
    if (req.clientId !== listing.companyId || req.listingId !== listingId) throw new ConvexError(LAB_REFUSE.notThisLot);
    if (req.status !== "released") throw new ConvexError(LAB_REFUSE.notReleased);
    await ctx.db.patch(listingId, { labRequestId: requestId });
    return null;
  },
});

export const detachLabReport = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    await requireSeller(ctx, listing.companyId);
    await ctx.db.patch(listingId, { labRequestId: undefined });
    return null;
  },
});

/** A factory offers on an open lot. Its pending offer on the same lot, if any, is replaced. */
export const makeOffer = mutation({
  args: {
    companyId: v.id("companies"),
    listingId: v.id("listings"),
    quantityKg: v.number(),
    priceDzdPerKg: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, company } = await requireBuyer(ctx, args.companyId);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    if (listing.status !== "open") throw new ConvexError(MARKET_REFUSE.closed);
    const quantityKg = cleanQuantity(args.quantityKg);
    if (!offerFits({ quantityKg }, listing.remainingKg)) throw new ConvexError(MARKET_REFUSE.tooMuch);
    const priceDzdPerKg = cleanPrice(args.priceDzdPerKg);
    const message = cleanNote(args.message);

    const pending = (
      await ctx.db
        .query("offers")
        .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
        .collect()
    ).find((o) => o.buyerId === company._id && o.status === "pending");
    const now = Date.now();
    if (pending) {
      await ctx.db.patch(pending._id, { quantityKg, priceDzdPerKg, message, createdBy: user._id, createdAt: now });
      return pending._id;
    }
    return await ctx.db.insert("offers", {
      listingId: listing._id,
      sellerId: listing.companyId,
      buyerId: company._id,
      quantityKg,
      priceDzdPerKg,
      message,
      status: "pending",
      createdBy: user._id,
      createdAt: now,
    });
  },
});

export const withdrawOffer = mutation({
  args: { offerId: v.id("offers") },
  handler: async (ctx, { offerId }) => {
    const offer = await ctx.db.get(offerId);
    if (!offer) throw new ConvexError(MARKET_REFUSE.noOffer);
    await requireBuyer(ctx, offer.buyerId);
    if (offer.status !== "pending") throw new ConvexError(MARKET_REFUSE.answered);
    await ctx.db.patch(offerId, { status: "withdrawn", respondedAt: Date.now() });
    return null;
  },
});

/** The farm accepts (→ a sale) or declines a pending offer. */
export const respond = mutation({
  args: { offerId: v.id("offers"), accept: v.boolean() },
  handler: async (ctx, { offerId, accept }) => {
    const offer = await ctx.db.get(offerId);
    if (!offer) throw new ConvexError(MARKET_REFUSE.noOffer);
    await requireSeller(ctx, offer.sellerId);
    if (offer.status !== "pending") throw new ConvexError(MARKET_REFUSE.answered);
    const now = Date.now();
    if (!accept) {
      await ctx.db.patch(offerId, { status: "declined", respondedAt: now });
      return { saleId: null };
    }

    const listing = await ctx.db.get(offer.listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    if (listing.status !== "open") throw new ConvexError(MARKET_REFUSE.closed);
    if (!offerFits(offer, listing.remainingKg)) throw new ConvexError(MARKET_REFUSE.tooMuch);

    const remainingKg = listing.remainingKg - offer.quantityKg;
    await ctx.db.patch(listing._id, { remainingKg, status: remainingKg === 0 ? "sold" : "open" });
    await ctx.db.patch(offerId, { status: "accepted", respondedAt: now });
    await declinePending(ctx, listing._id, (o) => o._id === offerId || offerFits(o, remainingKg));

    const saleId = await ctx.db.insert("sales", {
      listingId: listing._id,
      offerId,
      sellerId: offer.sellerId,
      buyerId: offer.buyerId,
      residue: listing.residue,
      residueName: listing.residueName,
      quantityKg: offer.quantityKg,
      priceDzdPerKg: offer.priceDzdPerKg,
      ...saleAmounts(offer.quantityKg, offer.priceDzdPerKg),
      createdAt: now,
    });
    return { saleId };
  },
});

/** The factory's offers, newest first. */
export const myOffers = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireMember(ctx, companyId);
    const rows = await ctx.db
      .query("offers")
      .withIndex("by_buyer", (q) => q.eq("buyerId", companyId))
      .order("desc")
      .take(200);
    const out = [];
    for (const o of rows) {
      const [listing, seller] = await Promise.all([ctx.db.get(o.listingId), ctx.db.get(o.sellerId)]);
      out.push({
        offerId: o._id,
        listingId: o.listingId,
        residue: listing?.residue ?? "",
        residueName: listing?.residueName,
        sellerName: seller?.name ?? "",
        sellerRegion: listing?.region ?? seller?.region ?? "",
        quantityKg: o.quantityKg,
        priceDzdPerKg: o.priceDzdPerKg,
        totalDzd: saleAmounts(o.quantityKg, o.priceDzdPerKg).totalDzd,
        status: o.status,
        createdAt: o.createdAt,
        listingStatus: listing?.status ?? "withdrawn",
      });
    }
    return out;
  },
});

/** Sales the workspace made or received, newest first. No phones: BiorefMind puts the two sides in touch. */
export const mySales = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const { company } = await requireMember(ctx, companyId);
    const side = company.kind === "farm" ? "sold" : "bought";
    const rows =
      side === "sold"
        ? await ctx.db
            .query("sales")
            .withIndex("by_seller", (q) => q.eq("sellerId", companyId))
            .order("desc")
            .take(200)
        : await ctx.db
            .query("sales")
            .withIndex("by_buyer", (q) => q.eq("buyerId", companyId))
            .order("desc")
            .take(200);
    const out = [];
    for (const s of rows) {
      const other = await ctx.db.get(side === "sold" ? s.buyerId : s.sellerId);
      out.push({
        saleId: s._id,
        residue: s.residue,
        residueName: s.residueName,
        quantityKg: s.quantityKg,
        priceDzdPerKg: s.priceDzdPerKg,
        totalDzd: s.totalDzd,
        feeDzd: s.feeDzd,
        side,
        otherName: other?.name ?? "",
        otherRegion: other?.region ?? "",
        createdAt: s.createdAt,
      });
    }
    return out;
  },
});

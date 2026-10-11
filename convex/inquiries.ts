import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logAdmin, requireAdmin } from "./admin";
import { getAppUser } from "./auth";
import {
  cleanInquiry,
  INQUIRIES_PER_DAY,
  INQUIRIES_PER_PHONE_DAY,
  INQUIRY_REFUSE,
  phoneDigits,
} from "./lib/inquiries";
import { MARKET_REFUSE } from "./lib/market";

// Interest requests on the lots BiorefMind sells for farmers. Anyone may send one; only admins read them.
// Design: docs/superpowers/specs/2026-10-11-fresh-managed-admin-design.md

const DAY = 86_400_000;
const dayStart = (ms: number) => Math.floor(ms / DAY) * DAY;

const status = v.union(v.literal("new"), v.literal("contacted"), v.literal("closed"));

/** Someone (signed in or not) is interested in a BiorefMind lot. BiorefMind calls back. */
export const send = mutation({
  args: {
    listingId: v.id("listings"),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    quantityKg: v.optional(v.number()),
    message: v.optional(v.string()),
    website: v.optional(v.string()), // honeypot: people never see it, so only bots fill it
  },
  handler: async (ctx, { listingId, website, ...raw }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    if (listing.status !== "open") throw new ConvexError(MARKET_REFUSE.closed);
    if (!listing.managed) throw new ConvexError(INQUIRY_REFUSE.notManaged);
    const clean = cleanInquiry(raw);
    if (website?.trim()) return null;

    const now = Date.now();
    const digits = phoneDigits(clean.phone);
    const fromPhone = await ctx.db
      .query("inquiries")
      .withIndex("by_phone", (q) => q.eq("phoneDigits", digits).gte("createdAt", dayStart(now)))
      .take(INQUIRIES_PER_PHONE_DAY);
    if (fromPhone.length >= INQUIRIES_PER_PHONE_DAY) throw new ConvexError(INQUIRY_REFUSE.tooMany);
    const today = await ctx.db
      .query("inquiries")
      .withIndex("by_created", (q) => q.gte("createdAt", dayStart(now)))
      .take(INQUIRIES_PER_DAY);
    if (today.length >= INQUIRIES_PER_DAY) throw new ConvexError(INQUIRY_REFUSE.busy);

    const user = await getAppUser(ctx);
    await ctx.db.insert("inquiries", {
      listingId,
      ...clean,
      phoneDigits: digits,
      userId: user?._id,
      status: "new",
      createdAt: now,
    });
    return null;
  },
});

/** The latest 200 interest requests (optionally of one status), each with its lot and the farmer behind it. */
export const list = query({
  args: { status: v.optional(status) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = args.status
      ? await ctx.db
          .query("inquiries")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(200)
      : await ctx.db.query("inquiries").withIndex("by_created").order("desc").take(200);
    const out = [];
    for (const r of rows) {
      const [l, user] = await Promise.all([ctx.db.get(r.listingId), r.userId ? ctx.db.get(r.userId) : null]);
      out.push({
        inquiryId: r._id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        company: r.company,
        quantityKg: r.quantityKg,
        message: r.message,
        signedInAs: user?.email,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        lot: l
          ? {
              listingId: l._id,
              category: l.category ?? "residue",
              residue: l.residue,
              residueName: l.residueName,
              remainingKg: l.remainingKg,
              priceDzdPerKg: l.priceDzdPerKg,
              region: l.region,
              partnerNo: l.partnerNo,
              farmerName: l.managed?.farmerName ?? "",
              farmerPhone: l.managed?.farmerPhone ?? "",
              status: l.status,
            }
          : null,
      });
    }
    return out;
  },
});

/** The admin marks a request contacted or closed (or back to new), with an optional private note. */
export const setStatus = mutation({
  args: { inquiryId: v.id("inquiries"), status, adminNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get(args.inquiryId);
    if (!row) throw new ConvexError(INQUIRY_REFUSE.noInquiry);
    const adminNote = args.adminNote === undefined ? row.adminNote : args.adminNote.trim() || undefined;
    if (adminNote && adminNote.length > 1000) throw new ConvexError(INQUIRY_REFUSE.adminNote);
    await ctx.db.patch(row._id, { status: args.status, adminNote, updatedAt: Date.now() });
    await logAdmin(ctx, admin, `inquiry.${args.status}`, `${row.name} (${row.phone})${adminNote ? `: ${adminNote}` : ""}`);
    return null;
  },
});

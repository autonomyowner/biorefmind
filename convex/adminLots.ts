import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { applyLotEdit, logAdmin, lotEditArgs, photoList, requireAdmin } from "./admin";
import { cleanRegion, isAdmin, REFUSE } from "./lib/accounts";
import { cleanInquiry, cleanText, INQUIRY_REFUSE, MAX_HOUSE_PHOTOS, partnerKey } from "./lib/inquiries";
import { cleanNote, cleanPrice, cleanProduct, cleanQuantity, MARKET_REFUSE } from "./lib/market";
import { queuePhotoCheck } from "./photoCheck";

// Lots BiorefMind posts for farmers who are not on the platform. The public sees "BiorefMind partner farm #N",
// never the farmer's name or phone; buyers send interest requests (inquiries.ts) instead of offers.
// Design: docs/superpowers/specs/2026-10-11-fresh-managed-admin-design.md

/** The one house farm that owns these lots; made on first use, owned by the admin, with no membership. */
async function houseCompany(ctx: MutationCtx, admin: Doc<"users">): Promise<Doc<"companies">> {
  const found = await ctx.db
    .query("companies")
    .withIndex("by_house", (q) => q.eq("house", true))
    .first();
  if (found) return found;
  const id = await ctx.db.insert("companies", {
    name: "BiorefMind",
    kind: "farm",
    region: "Algeria",
    ownerId: admin._id,
    plan: "free",
    shipmentSeq: 0,
    house: true,
    partnerSeq: 0,
    createdAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

async function houseLot(ctx: MutationCtx, listingId: Id<"listings">) {
  const listing = await ctx.db.get(listingId);
  if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
  if (!listing.managed) throw new ConvexError(INQUIRY_REFUSE.notHouse);
  return listing as Doc<"listings"> & { managed: NonNullable<Doc<"listings">["managed"]> };
}

/** The farmer's details as typed by the admin: name 2–80, phone optional (checked like a visitor's), note ≤ 1000. */
function cleanFarmer(a: { farmerName: string; farmerPhone?: string; privateNote?: string }) {
  const farmerName = cleanText(a.farmerName, 2, 80, INQUIRY_REFUSE.farmerName);
  const farmerPhone = a.farmerPhone?.trim() ? cleanInquiry({ name: farmerName, phone: a.farmerPhone }).phone : undefined;
  const privateNote = a.privateNote?.trim() || undefined;
  if (privateNote && privateNote.length > 1000) throw new ConvexError(INQUIRY_REFUSE.adminNote);
  return { farmerName, farmerPhone, privateNote };
}

const label = (l: { residue: string; residueName?: string }) => l.residueName ?? l.residue;

export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const lotArgs = {
  category: v.optional(v.string()),
  residue: v.string(),
  residueName: v.optional(v.string()),
  quantityKg: v.number(),
  priceDzdPerKg: v.number(),
  region: v.string(),
  note: v.optional(v.string()),
  photoIds: v.array(v.id("_storage")),
  farmerName: v.string(),
  farmerPhone: v.optional(v.string()),
  privateNote: v.optional(v.string()),
};

export const create = mutation({
  args: lotArgs,
  handler: async (ctx, args) => createHouseLot(ctx, await requireAdmin(ctx), args),
});

/**
 * The same, from the command line (`npx convex run adminLots:importLot`), on behalf of an admin's account:
 * used to post the products the owner collected from farmers. Not callable from the website.
 */
export const importLot = internalMutation({
  args: { ...lotArgs, adminEmail: v.string() },
  handler: async (ctx, { adminEmail, ...args }) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", adminEmail.trim().toLowerCase()))
      .unique();
    if (!admin || !isAdmin(admin.email)) throw new ConvexError(REFUSE.admin);
    return await createHouseLot(ctx, admin, args);
  },
});

export const importUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

async function createHouseLot(
  ctx: MutationCtx,
  admin: Doc<"users">,
  args: {
    category?: string;
    residue: string;
    residueName?: string;
    quantityKg: number;
    priceDzdPerKg: number;
    region: string;
    note?: string;
    photoIds: Id<"_storage">[];
    farmerName: string;
    farmerPhone?: string;
    privateNote?: string;
  },
) {
  const { category, residue, residueName } = cleanProduct(args.category, args.residue, args.residueName);
  const quantityKg = cleanQuantity(args.quantityKg);
  const priceDzdPerKg = cleanPrice(args.priceDzdPerKg);
  const region = cleanRegion(args.region);
  const note = cleanNote(args.note);
  const managed = cleanFarmer(args);
  const photoIds = [...new Set(args.photoIds)];
  if (photoIds.length > MAX_HOUSE_PHOTOS) throw new ConvexError(INQUIRY_REFUSE.photos);

  const house = await houseCompany(ctx, admin);
  for (const storageId of photoIds) {
    const claimed = await ctx.db
      .query("photoClaims")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .first();
    if (claimed || !(await ctx.db.system.get(storageId))) throw new ConvexError(MARKET_REFUSE.photoMissing);
    await ctx.db.insert("photoClaims", { storageId, companyId: house._id });
  }

  // One partner number per farmer: reuse the number of this farmer's earlier lots.
  const key = partnerKey(managed);
  const earlier = await ctx.db
    .query("listings")
    .withIndex("by_company", (q) => q.eq("companyId", house._id))
    .collect();
  let partnerNo = earlier.find((l) => l.managed && partnerKey(l.managed) === key)?.partnerNo;
  if (partnerNo === undefined) {
    partnerNo = (house.partnerSeq ?? 0) + 1;
    await ctx.db.patch(house._id, { partnerSeq: partnerNo });
  }

  const listingId = await ctx.db.insert("listings", {
    companyId: house._id,
    category,
    residue,
    residueName,
    quantityKg,
    remainingKg: quantityKg,
    priceDzdPerKg,
    region,
    note,
    photoIds,
    status: "open",
    managed,
    partnerNo,
    createdBy: admin._id,
    createdAt: Date.now(),
  });
  if (photoIds.length > 0) await queuePhotoCheck(ctx, listingId, house._id);
  await logAdmin(ctx, admin, "lot.create", `${label({ residue, residueName })} · ${quantityKg} kg · partner farm #${partnerNo} (${managed.farmerName})`);
  return listingId;
}

/** The lot's own fields (admin.applyLotEdit: product, price, kg left, region, note, photos) and the private farmer details. */
export const update = mutation({
  args: {
    listingId: v.id("listings"),
    ...lotEditArgs,
    farmerName: v.optional(v.string()),
    farmerPhone: v.optional(v.string()), // "" clears it
    privateNote: v.optional(v.string()), // "" clears it
  },
  handler: async (ctx, { listingId, farmerName, farmerPhone, privateNote, ...lotArgs }) => {
    const admin = await requireAdmin(ctx);
    const listing = await houseLot(ctx, listingId);
    const changed = await applyLotEdit(ctx, listing, lotArgs);
    if (farmerName !== undefined || farmerPhone !== undefined || privateNote !== undefined) {
      // The partner number stays: the public name of a lot does not change after it is posted.
      const managed = cleanFarmer({
        farmerName: farmerName ?? listing.managed.farmerName,
        farmerPhone: farmerPhone ?? listing.managed.farmerPhone,
        privateNote: privateNote ?? listing.managed.privateNote,
      });
      await ctx.db.patch(listing._id, { managed });
      changed.push("farmer");
    }
    if (changed.length === 0) return null;
    await logAdmin(ctx, admin, "lot.update", `${label(listing)} · partner farm #${listing.partnerNo}: ${changed.join(", ")}`);
    return null;
  },
});

export const setStatus = mutation({
  args: { listingId: v.id("listings"), status: v.union(v.literal("open"), v.literal("sold"), v.literal("withdrawn")) },
  handler: async (ctx, { listingId, status }) => {
    const admin = await requireAdmin(ctx);
    const listing = await houseLot(ctx, listingId);
    const patch: Partial<Doc<"listings">> = { status, withdrawnReason: undefined };
    // Reopening a sold-out lot puts its listed quantity back.
    if (status === "open" && listing.remainingKg === 0) patch.remainingKg = listing.quantityKg;
    await ctx.db.patch(listingId, patch);
    await logAdmin(ctx, admin, `lot.${status}`, `${label(listing)} · partner farm #${listing.partnerNo}`);
    return null;
  },
});

/** Every lot BiorefMind posted (newest first), with the farmer's private details and interest counts. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const house = await ctx.db
      .query("companies")
      .withIndex("by_house", (q) => q.eq("house", true))
      .first();
    if (!house) return [];
    const rows = await ctx.db
      .query("listings")
      .withIndex("by_company", (q) => q.eq("companyId", house._id))
      .order("desc")
      .take(300);
    const out = [];
    for (const l of rows) {
      if (!l.managed) continue;
      const inquiries = await ctx.db
        .query("inquiries")
        .withIndex("by_listing", (q) => q.eq("listingId", l._id))
        .collect();
      const photos = await photoList(ctx, l.photoIds);
      out.push({
        listingId: l._id,
        category: l.category ?? "residue",
        residue: l.residue,
        residueName: l.residueName,
        quantityKg: l.quantityKg,
        remainingKg: l.remainingKg,
        priceDzdPerKg: l.priceDzdPerKg,
        region: l.region,
        note: l.note,
        status: l.status,
        photoUrls: photos.map((p) => p.url),
        photos,
        partnerNo: l.partnerNo,
        farmerName: l.managed.farmerName,
        farmerPhone: l.managed.farmerPhone ?? "",
        privateNote: l.managed.privateNote ?? "",
        inquiries: { total: inquiries.length, new: inquiries.filter((i) => i.status === "new").length },
        createdAt: l.createdAt,
      });
    }
    return out;
  },
});

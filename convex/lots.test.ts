/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

// Fresh produce, lots BiorefMind posts for offline farmers (hidden names), interest requests, admin moderation.
// Design: docs/superpowers/specs/2026-10-11-fresh-managed-admin-design.md

const modules = import.meta.glob("./**/*.*s");

beforeAll(async () => {
  await Promise.all(
    Object.entries(modules)
      .filter(([p]) => !p.endsWith("convex.config.ts") && !p.includes("_generated/") && !p.includes(".test."))
      .map(([, load]) => load()),
  );
}, 180_000);

// Lots with photos schedule the AI photo check; fake setTimeout so it never runs after a test.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubEnv("ADMIN_EMAILS", "boss@biorefmind.com");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function newBackend() {
  const t = convexTest(schema, modules);
  betterAuthTest.register(t);
  return t;
}
type Backend = ReturnType<typeof newBackend>;

async function member(t: Backend, email: string, name = "Test User") {
  const now = Date.now();
  const { userId, sessionId } = await t.run(async (ctx) => {
    const u = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: { model: "user", data: { name, email, emailVerified: true, createdAt: now, updatedAt: now } },
    });
    const s = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: { token: `t-${email}`, userId: u._id, expiresAt: now + 3_600_000, createdAt: now, updatedAt: now },
      },
    });
    return { userId: u._id as string, sessionId: s._id as string };
  });
  const as = t.withIdentity({ subject: userId, sessionId, email });
  await as.mutation(api.users.ensureUser, { name });
  return as;
}

async function farm(t: Backend) {
  const as = await member(t, "farmer@x.dz");
  const id = await as.mutation(api.companies.create, { kind: "farm", name: "Ferme Saïd", region: "Sétif", phone: "+213 555 11 11 11" });
  return { as, id };
}

async function factory(t: Backend) {
  const as = await member(t, "f@x.dz");
  const id = await as.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", region: "Blida", phone: "+213 555 22 22 22" });
  return { as, id };
}

async function photo(t: Backend): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => ctx.storage.store(new Blob(["jpeg"], { type: "image/jpeg" })));
}

const houseLot = {
  category: "residue" as const,
  residue: "pomegranate_peels",
  quantityKg: 500,
  priceDzdPerKg: 40,
  region: "Mascara",
  note: "Sun-dried under the trees",
  farmerName: "Ammi Rabah",
  farmerPhone: "0661 23 45 67",
  privateNote: "Call after the Asr prayer",
};

describe("fresh produce", () => {
  test("a farm lists fresh mushrooms; category shows everywhere and filters work", async () => {
    const t = newBackend();
    const f = await farm(t);
    const fresh = await f.as.mutation(api.market.createListing, {
      companyId: f.id,
      category: "fresh",
      residue: "mushrooms",
      quantityKg: 80,
      priceDzdPerKg: 450,
      photoIds: [],
    });
    await f.as.mutation(api.market.createListing, { companyId: f.id, residue: "olive_pomace", quantityKg: 2000, priceDzdPerKg: 15, photoIds: [] });

    expect((await f.as.query(api.market.myListings, { companyId: f.id })).map((l) => l.category)).toEqual(["residue", "fresh"]);
    expect(await t.query(api.market.publicLots, { category: "fresh" })).toMatchObject([{ listingId: fresh, category: "fresh", residue: "mushrooms", managed: false }]);
    expect(await t.query(api.market.publicLots, { category: "residue" })).toMatchObject([{ residue: "olive_pomace", category: "residue" }]);
    expect(await t.query(api.market.publicLots, {})).toHaveLength(2);

    await expect(
      f.as.mutation(api.market.createListing, { companyId: f.id, category: "fresh", residue: "olive_pomace", quantityKg: 1, priceDzdPerKg: 1, photoIds: [] }),
    ).rejects.toThrow("Choose a product from the list.");

    // Selling fresh produce: both fees, carried on the sale with its category.
    const buyer = await factory(t);
    const offerId = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId: fresh, quantityKg: 80, priceDzdPerKg: 450 });
    await f.as.mutation(api.market.respond, { offerId, accept: true });
    expect(await f.as.query(api.market.mySales, { companyId: f.id })).toMatchObject([
      { category: "fresh", residue: "mushrooms", totalDzd: 36_000, feeDzd: 1800, sellerFeeDzd: 1800 },
    ]);
  });
});

describe("BiorefMind lots (hidden names)", () => {
  test("the admin posts a lot for an offline farmer; the public never sees who the farmer is", async () => {
    const t = newBackend();
    const boss = await member(t, "boss@biorefmind.com", "Boss");
    const [p1, p2] = [await photo(t), await photo(t)];
    const listingId = await boss.mutation(api.adminLots.create, { ...houseLot, photoIds: [p1, p2] });

    const [pub] = await t.query(api.market.publicLots, {});
    expect(pub).toMatchObject({ listingId, managed: true, partnerNo: 1, sellerName: "", region: "Mascara", category: "residue" });
    expect(pub.photoUrls).toHaveLength(2);
    const text = JSON.stringify(await t.query(api.market.publicLots, {}));
    for (const secret of ["Rabah", "0661", "Asr"]) expect(text).not.toContain(secret);

    // Same farmer (same phone digits) → same partner number; another farmer → the next one.
    const again = await boss.mutation(api.adminLots.create, { ...houseLot, residue: "corn_husks", farmerName: "Rabah", farmerPhone: "0661234567", photoIds: [] });
    const other = await boss.mutation(api.adminLots.create, {
      ...houseLot,
      category: "fresh",
      residue: "mushrooms",
      farmerName: "Mushroom house",
      farmerPhone: undefined,
      photoIds: [],
    });
    const byId = Object.fromEntries((await t.query(api.market.publicLots, {})).map((l) => [l.listingId, l.partnerNo]));
    expect(byId[again]).toBe(1);
    expect(byId[other]).toBe(2);

    // The admin sees the private fields.
    const mine = await boss.query(api.adminLots.list, {});
    expect(mine.find((l) => l.listingId === listingId)).toMatchObject({
      farmerName: "Ammi Rabah",
      farmerPhone: "0661 23 45 67",
      privateNote: "Call after the Asr prayer",
      partnerNo: 1,
      inquiries: { total: 0, new: 0 },
    });

    // The house company is not an account.
    const overview = await boss.query(api.admin.overview, {});
    expect(overview.accounts).toEqual([]);
    expect(overview.stats).toMatchObject({ openLots: 3, newInquiries: 0 });

    // Factories send interest, not offers.
    const buyer = await factory(t);
    await expect(buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 10, priceDzdPerKg: 40 })).rejects.toThrow(
      "This lot is sold through BiorefMind: send your interest instead.",
    );

    // Others can't use the admin functions.
    await expect(buyer.as.query(api.adminLots.list, {})).rejects.toThrow("Only BiorefMind admins can do this.");
    await expect(buyer.as.mutation(api.adminLots.create, { ...houseLot, photoIds: [] })).rejects.toThrow("Only BiorefMind admins can do this.");
  });

  test("at most 3 photos; edit, mark sold, reopen and withdraw are logged", async () => {
    const t = newBackend();
    const boss = await member(t, "boss@biorefmind.com", "Boss");
    const photos = [await photo(t), await photo(t), await photo(t), await photo(t)];
    await expect(boss.mutation(api.adminLots.create, { ...houseLot, photoIds: photos })).rejects.toThrow("You can attach up to 3 photos.");
    await expect(boss.mutation(api.adminLots.create, { ...houseLot, farmerName: "A", photoIds: [] })).rejects.toThrow(
      "Enter the farmer's name (2 to 80 characters).",
    );
    const listingId = await boss.mutation(api.adminLots.create, { ...houseLot, photoIds: photos.slice(0, 3) });

    await boss.mutation(api.adminLots.update, { listingId, priceDzdPerKg: 45, remainingKg: 300, note: "  " });
    expect((await t.query(api.market.publicLots, {}))[0]).toMatchObject({ priceDzdPerKg: 45, remainingKg: 300 });
    expect((await t.query(api.market.publicLots, {}))[0].note).toBeUndefined();
    await expect(boss.mutation(api.adminLots.update, { listingId, remainingKg: 501 })).rejects.toThrow(
      "Quantity left must be between 0 and the listed quantity.",
    );

    await boss.mutation(api.adminLots.setStatus, { listingId, status: "sold" });
    expect(await t.query(api.market.publicLots, {})).toEqual([]);
    await boss.mutation(api.adminLots.setStatus, { listingId, status: "open" });
    expect(await t.query(api.market.publicLots, {})).toHaveLength(1);
    await boss.mutation(api.adminLots.setStatus, { listingId, status: "withdrawn" });
    expect(await t.query(api.market.publicLots, {})).toEqual([]);

    const log = await boss.query(api.admin.activity, {});
    expect(log.map((r) => r.action)).toEqual(["lot.withdrawn", "lot.open", "lot.sold", "lot.update", "lot.create"]);
    expect(log[0]).toMatchObject({ email: "boss@biorefmind.com" });

    // A farm's own lot is not the admin's to edit through these functions.
    const f = await farm(t);
    const farmLot = await f.as.mutation(api.market.createListing, { companyId: f.id, residue: "olive_pomace", quantityKg: 10, priceDzdPerKg: 5, photoIds: [] });
    await expect(boss.mutation(api.adminLots.update, { listingId: farmLot, priceDzdPerKg: 1 })).rejects.toThrow("This lot was not posted by BiorefMind.");
  });
});

describe("interest requests", () => {
  test("a guest asks about a BiorefMind lot; the admin sees it with the farmer, and works it", async () => {
    const t = newBackend();
    const boss = await member(t, "boss@biorefmind.com", "Boss");
    const listingId = await boss.mutation(api.adminLots.create, { ...houseLot, photoIds: [] });

    await t.mutation(api.inquiries.send, {
      listingId,
      name: " Karim ",
      phone: "0550 00 00 01",
      company: "Extraits du Sud",
      quantityKg: 200,
      message: "Is it still dry?",
    });
    // The honeypot: accepted, never stored.
    await t.mutation(api.inquiries.send, { listingId, name: "Bot", phone: "0550000002", website: "http://spam" });

    const rows = await boss.query(api.inquiries.list, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Karim",
      phone: "0550 00 00 01",
      company: "Extraits du Sud",
      quantityKg: 200,
      status: "new",
      lot: { listingId, residue: "pomegranate_peels", category: "residue", partnerNo: 1, farmerName: "Ammi Rabah", farmerPhone: "0661 23 45 67", status: "open" },
    });
    expect((await boss.query(api.admin.overview, {})).stats.newInquiries).toBe(1);
    expect((await boss.query(api.adminLots.list, {}))[0].inquiries).toEqual({ total: 1, new: 1 });

    await boss.mutation(api.inquiries.setStatus, { inquiryId: rows[0].inquiryId, status: "contacted", adminNote: "Sends a truck Monday" });
    expect(await boss.query(api.inquiries.list, { status: "new" })).toEqual([]);
    expect(await boss.query(api.inquiries.list, { status: "contacted" })).toMatchObject([{ adminNote: "Sends a truck Monday" }]);
    expect((await boss.query(api.admin.activity, {}))[0]).toMatchObject({ action: "inquiry.contacted" });

    const buyer = await factory(t);
    await expect(buyer.as.query(api.inquiries.list, {})).rejects.toThrow("Only BiorefMind admins can do this.");
    await expect(buyer.as.mutation(api.inquiries.setStatus, { inquiryId: rows[0].inquiryId, status: "closed" })).rejects.toThrow(
      "Only BiorefMind admins can do this.",
    );
  });

  test("signed-in visitors are linked; refusals in plain words; 5 a day per phone", async () => {
    const t = newBackend();
    const boss = await member(t, "boss@biorefmind.com", "Boss");
    const listingId = await boss.mutation(api.adminLots.create, { ...houseLot, photoIds: [] });
    const buyer = await factory(t);
    await buyer.as.mutation(api.inquiries.send, { listingId, name: "Peel buyer", phone: "0550 11 11 11" });
    expect((await boss.query(api.inquiries.list, {}))[0]).toMatchObject({ signedInAs: "f@x.dz" });

    await expect(t.mutation(api.inquiries.send, { listingId, name: "K", phone: "0550" })).rejects.toThrow("Please enter your name (2 to 80 characters).");
    await expect(t.mutation(api.inquiries.send, { listingId, name: "Karim", phone: "abc" })).rejects.toThrow("Please enter a phone number we can call.");

    for (let i = 0; i < 4; i++) await t.mutation(api.inquiries.send, { listingId, name: "Karim", phone: "+213 550 11 11 11" });
    await expect(t.mutation(api.inquiries.send, { listingId, name: "Karim", phone: "0550111111" })).rejects.toThrow(
      "You've sent several requests today. BiorefMind will call you back soon.",
    );

    // Regular farm lots take offers; closed lots take nothing.
    const f = await farm(t);
    const farmLot = await f.as.mutation(api.market.createListing, { companyId: f.id, residue: "olive_pomace", quantityKg: 10, priceDzdPerKg: 5, photoIds: [] });
    await expect(t.mutation(api.inquiries.send, { listingId: farmLot, name: "Karim", phone: "0550 22 22 22" })).rejects.toThrow(
      "This lot takes offers: sign up as a factory to make one.",
    );
    await boss.mutation(api.adminLots.setStatus, { listingId, status: "sold" });
    await expect(t.mutation(api.inquiries.send, { listingId, name: "Karim", phone: "0550 33 33 33" })).rejects.toThrow("This listing is no longer open.");
  });
});

describe("admin moderation", () => {
  test("the admin sees every open lot with the real seller, and can withdraw one with a reason", async () => {
    const t = newBackend();
    const boss = await member(t, "boss@biorefmind.com", "Boss");
    const f = await farm(t);
    const buyer = await factory(t);
    const listingId = await f.as.mutation(api.market.createListing, { companyId: f.id, residue: "olive_pomace", quantityKg: 10, priceDzdPerKg: 5, photoIds: [] });
    const offerId = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 5, priceDzdPerKg: 5 });
    await boss.mutation(api.adminLots.create, { ...houseLot, photoIds: [] });

    const open = await boss.query(api.admin.openLots, {});
    expect(open).toHaveLength(2);
    expect(open.find((l) => l.listingId === listingId)).toMatchObject({ seller: "Ferme Saïd", sellerPhone: "+213 555 11 11 11", managed: false, pendingOffers: 1 });
    expect(open.find((l) => l.managed)).toMatchObject({ seller: "Ammi Rabah", sellerPhone: "0661 23 45 67", partnerNo: 1 });

    await expect(boss.mutation(api.admin.withdrawLot, { listingId, reason: "x" })).rejects.toThrow("Please write a short reason (2 to 300 characters).");
    await boss.mutation(api.admin.withdrawLot, { listingId, reason: "Photos show household waste" });
    const [mine] = await f.as.query(api.market.myListings, { companyId: f.id });
    expect(mine).toMatchObject({ status: "withdrawn", withdrawnReason: "Photos show household waste" });
    expect(mine.offers[0]).toMatchObject({ offerId, status: "declined" });
    expect((await boss.query(api.admin.activity, {}))[0]).toMatchObject({ action: "lot.moderated", detail: expect.stringContaining("Photos show household waste") });
    await expect(f.as.query(api.admin.openLots, {})).rejects.toThrow("Only BiorefMind admins can do this.");
  });

  test("lab billing actions are logged too", async () => {
    const t = newBackend();
    const boss = await member(t, "boss@biorefmind.com", "Boss");
    const lab = await member(t, "lab@x.dz");
    const labId = await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Sétif", region: "Sétif", phone: "036 00 00 00", services: ["moisture"] });
    await boss.mutation(api.admin.extendLab, { companyId: labId, months: 3 });
    await boss.mutation(api.admin.endLabPlan, { companyId: labId });
    expect((await boss.query(api.admin.activity, {})).map((r) => r.action)).toEqual(["lab.end", "lab.extend"]);
  });
});

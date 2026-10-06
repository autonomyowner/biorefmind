/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

beforeAll(async () => {
  await Promise.all(
    Object.entries(modules)
      .filter(([p]) => !p.endsWith("convex.config.ts") && !p.includes("_generated/") && !p.includes(".test."))
      .map(([, load]) => load()),
  );
}, 180_000);

function newBackend() {
  const t = convexTest(schema, modules);
  betterAuthTest.register(t);
  return t;
}
type Backend = ReturnType<typeof newBackend>;

/** A Better Auth login with a live session, plus its app profile. */
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
type Member = Awaited<ReturnType<typeof member>>;

async function farm(t: Backend, email = "farmer@x.dz", name = "Ferme Saïd") {
  const as = await member(t, email);
  const id = await as.mutation(api.companies.create, { kind: "farm", name, region: "Sétif", phone: "+213 555 11 11 11" });
  return { as, id };
}

async function factory(t: Backend, email = "f@x.dz", name = "Peel Factory") {
  const as = await member(t, email);
  const id = await as.mutation(api.companies.create, {
    kind: "factory",
    name,
    region: "Blida",
    phone: "+213 555 22 22 22",
  });
  return { as, id };
}

async function photo(t: Backend): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => ctx.storage.store(new Blob(["jpeg"], { type: "image/jpeg" })));
}

const lot = { residue: "olive_pomace", quantityKg: 2000, priceDzdPerKg: 15 };

async function list(
  as: Member,
  companyId: Id<"companies">,
  extra: Partial<typeof lot> & { note?: string; residueName?: string } = {},
) {
  return await as.mutation(api.market.createListing, { companyId, ...lot, photoIds: [], ...extra });
}

describe("listings", () => {
  test("a farmer lists a lot with photos; it shows in their list and in browse without the phone", async () => {
    const t = newBackend();
    const f = await farm(t);
    const p = await photo(t);
    const listingId = await f.as.mutation(api.market.createListing, {
      companyId: f.id,
      ...lot,
      priceDzdPerKg: 15.004,
      note: "  Dry, in 50 kg bags  ",
      photoIds: [p],
    });

    const [mine] = await f.as.query(api.market.myListings, { companyId: f.id });
    expect(mine).toMatchObject({
      listingId,
      residue: "olive_pomace",
      quantityKg: 2000,
      remainingKg: 2000,
      priceDzdPerKg: 15,
      region: "Sétif",
      note: "Dry, in 50 kg bags",
      status: "open",
      offers: [],
    });
    expect(mine.photoUrls).toHaveLength(1);

    const buyer = await factory(t);
    const browse = await buyer.as.query(api.market.browse, {});
    expect(browse).toMatchObject([{ listingId, sellerName: "Ferme Saïd", remainingKg: 2000, region: "Sétif" }]);
    expect(JSON.stringify(browse)).not.toContain("555");
    expect(await buyer.as.query(api.market.browse, { residue: "date_pits" })).toEqual([]);
    await expect(t.query(api.market.browse, {})).rejects.toThrow("Please sign in to continue.");
  });

  test("refusals: kind, residue, quantity, price, note, photos, someone else's farm", async () => {
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    await expect(list(buyer.as, buyer.id)).rejects.toThrow("Only farm accounts can list residues.");
    await expect(list(f.as, f.id, { residue: "gold" })).rejects.toThrow("Choose a residue from the list.");
    await expect(list(f.as, f.id, { quantityKg: 0 })).rejects.toThrow(
      "Quantity must be a whole number of kilograms (1 to 10,000,000).",
    );
    await expect(list(f.as, f.id, { priceDzdPerKg: 0 })).rejects.toThrow("Price must be between 0.01 and 100,000 DA per kg.");
    await expect(list(f.as, f.id, { note: "x".repeat(1001) })).rejects.toThrow("The note can be up to 1000 characters.");
    const photos = await Promise.all([1, 2, 3, 4, 5].map(() => photo(t)));
    await expect(
      f.as.mutation(api.market.createListing, { companyId: f.id, ...lot, photoIds: photos }),
    ).rejects.toThrow("You can attach up to 4 photos.");
    await expect(list(buyer.as, f.id)).rejects.toThrow("You don't have access to this workspace.");
    await expect(buyer.as.mutation(api.market.generateUploadUrl, { companyId: buyer.id })).rejects.toThrow(
      "Only farm accounts can list residues.",
    );
  });

  test("a photo can be attached only once", async () => {
    const t = newBackend();
    const f = await farm(t);
    const p = await photo(t);
    await f.as.mutation(api.market.createListing, { companyId: f.id, ...lot, photoIds: [p] });
    await expect(f.as.mutation(api.market.createListing, { companyId: f.id, ...lot, photoIds: [p] })).rejects.toThrow(
      "One of the photos could not be found. Please upload it again.",
    );
  });

  test("withdrawing a lot hides it and declines its pending offers", async () => {
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    const listingId = await list(f.as, f.id);
    const offerId = await buyer.as.mutation(api.market.makeOffer, {
      companyId: buyer.id,
      listingId,
      quantityKg: 500,
      priceDzdPerKg: 14,
    });
    await expect(buyer.as.mutation(api.market.withdrawListing, { listingId })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
    await f.as.mutation(api.market.withdrawListing, { listingId });
    expect(await buyer.as.query(api.market.browse, {})).toEqual([]);
    expect((await buyer.as.query(api.market.myOffers, { companyId: buyer.id }))[0]).toMatchObject({
      offerId,
      status: "declined",
      listingStatus: "withdrawn",
    });
    await expect(f.as.mutation(api.market.withdrawListing, { listingId })).rejects.toThrow("This listing is no longer open.");
  });
});

describe("offers and sales", () => {
  test("offer → accept records a sale with the 5% buyer fee; neither side ever sees a phone", async () => {
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    const listingId = await list(f.as, f.id);

    // Before the sale, neither side sees the other's phone.
    const offerId = await buyer.as.mutation(api.market.makeOffer, {
      companyId: buyer.id,
      listingId,
      quantityKg: 2000,
      priceDzdPerKg: 14,
      message: " Can collect next week ",
    });
    const [mine] = await f.as.query(api.market.myListings, { companyId: f.id });
    expect(mine.offers).toMatchObject([
      { offerId, buyerName: "Peel Factory", buyerRegion: "Blida", quantityKg: 2000, totalDzd: 28_000, message: "Can collect next week", status: "pending" },
    ]);
    expect(JSON.stringify(mine)).not.toContain("555");

    const { saleId } = await f.as.mutation(api.market.respond, { offerId, accept: true });
    expect(saleId).toBeTruthy();

    expect(await f.as.query(api.market.mySales, { companyId: f.id })).toMatchObject([
      {
        saleId,
        side: "sold",
        residue: "olive_pomace",
        quantityKg: 2000,
        priceDzdPerKg: 14,
        totalDzd: 28_000,
        feeDzd: 1400,
        otherName: "Peel Factory",
      },
    ]);
    expect(await buyer.as.query(api.market.mySales, { companyId: buyer.id })).toMatchObject([
      { saleId, side: "bought", otherName: "Ferme Saïd", otherRegion: "Sétif", feeDzd: 1400 },
    ]);
    // BiorefMind connects them: phones reach only the admin page.
    expect(JSON.stringify(await f.as.query(api.market.mySales, { companyId: f.id }))).not.toContain("555");
    expect(JSON.stringify(await buyer.as.query(api.market.mySales, { companyId: buyer.id }))).not.toContain("555");
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0]).toMatchObject({ status: "sold", remainingKg: 0 });
    expect(await buyer.as.query(api.market.browse, {})).toEqual([]);
    await expect(f.as.mutation(api.market.respond, { offerId, accept: true })).rejects.toThrow(
      "This offer has already been answered.",
    );
  });

  test("a partial sale lowers what is left and declines pending offers that no longer fit", async () => {
    const t = newBackend();
    const f = await farm(t);
    const a = await factory(t, "a@x.dz", "Factory A");
    const b = await factory(t, "b@x.dz", "Factory B");
    const c = await factory(t, "c@x.dz", "Factory C");
    const listingId = await list(f.as, f.id);
    const offerA = await a.as.mutation(api.market.makeOffer, { companyId: a.id, listingId, quantityKg: 1500, priceDzdPerKg: 15 });
    const offerB = await b.as.mutation(api.market.makeOffer, { companyId: b.id, listingId, quantityKg: 800, priceDzdPerKg: 16 });
    const offerC = await c.as.mutation(api.market.makeOffer, { companyId: c.id, listingId, quantityKg: 500, priceDzdPerKg: 13 });

    await f.as.mutation(api.market.respond, { offerId: offerA, accept: true });
    const [l] = await f.as.query(api.market.myListings, { companyId: f.id });
    expect(l).toMatchObject({ status: "open", remainingKg: 500 });
    const status = Object.fromEntries(l.offers.map((o) => [o.offerId, o.status]));
    expect(status).toEqual({ [offerA]: "accepted", [offerB]: "declined", [offerC]: "pending" });
    expect((await a.as.query(api.market.browse, {}))[0]).toMatchObject({ remainingKg: 500 });

    await expect(
      b.as.mutation(api.market.makeOffer, { companyId: b.id, listingId, quantityKg: 501, priceDzdPerKg: 16 }),
    ).rejects.toThrow("You can't offer more than the quantity left.");

    await f.as.mutation(api.market.respond, { offerId: offerC, accept: true });
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0]).toMatchObject({ status: "sold", remainingKg: 0 });
  });

  test("offering again replaces the pending offer; decline and withdraw", async () => {
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    const listingId = await list(f.as, f.id);
    const first = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 500, priceDzdPerKg: 12 });
    const again = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 600, priceDzdPerKg: 13 });
    expect(again).toBe(first);
    expect(await buyer.as.query(api.market.myOffers, { companyId: buyer.id })).toMatchObject([
      { offerId: first, quantityKg: 600, priceDzdPerKg: 13, totalDzd: 7800, sellerName: "Ferme Saïd", status: "pending", listingStatus: "open" },
    ]);

    expect(await f.as.mutation(api.market.respond, { offerId: first, accept: false })).toEqual({ saleId: null });
    expect((await buyer.as.query(api.market.myOffers, { companyId: buyer.id }))[0].status).toBe("declined");
    await expect(buyer.as.mutation(api.market.withdrawOffer, { offerId: first })).rejects.toThrow(
      "This offer has already been answered.",
    );

    // After a decline, a new offer is a new row.
    const second = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 100, priceDzdPerKg: 14 });
    expect(second).not.toBe(first);
    await buyer.as.mutation(api.market.withdrawOffer, { offerId: second });
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].offers.map((o) => o.status).sort()).toEqual([
      "declined",
      "withdrawn",
    ]);
    expect(await f.as.query(api.market.mySales, { companyId: f.id })).toEqual([]);
  });

  test("offer and answer refusals", async () => {
    const t = newBackend();
    const f = await farm(t);
    const other = await farm(t, "other@x.dz", "Ferme Autre");
    const buyer = await factory(t);
    const listingId = await list(f.as, f.id);

    await expect(
      other.as.mutation(api.market.makeOffer, { companyId: other.id, listingId, quantityKg: 10, priceDzdPerKg: 10 }),
    ).rejects.toThrow("Only factory accounts can make offers.");
    await expect(
      buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 2001, priceDzdPerKg: 10 }),
    ).rejects.toThrow("You can't offer more than the quantity left.");
    await expect(
      buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 10, priceDzdPerKg: -1 }),
    ).rejects.toThrow("Price must be between 0.01 and 100,000 DA per kg.");
    await expect(
      buyer.as.mutation(api.market.makeOffer, { companyId: f.id, listingId, quantityKg: 10, priceDzdPerKg: 10 }),
    ).rejects.toThrow("You don't have access to this workspace.");

    const offerId = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 10, priceDzdPerKg: 10 });
    // Only the seller answers; only the buyer withdraws.
    await expect(buyer.as.mutation(api.market.respond, { offerId, accept: true })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
    await expect(other.as.mutation(api.market.respond, { offerId, accept: true })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
    await expect(f.as.mutation(api.market.withdrawOffer, { offerId })).rejects.toThrow("You don't have access to this workspace.");
    await expect(other.as.query(api.market.myListings, { companyId: f.id })).rejects.toThrow(
      "You don't have access to this workspace.",
    );

    // A removed lot.
    await t.run(async (ctx) => ctx.db.delete(listingId));
    await expect(
      buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 10, priceDzdPerKg: 10 }),
    ).rejects.toThrow("This listing no longer exists.");
  });

  test("factory inspectors can browse but not offer", async () => {
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    const listingId = await list(f.as, f.id);
    await buyer.as.mutation(api.companies.invite, { companyId: buyer.id, email: "i@x.dz", role: "inspector" });
    const inspector = await member(t, "i@x.dz"); // signing in accepts the invitation
    expect(await inspector.query(api.market.browse, {})).toHaveLength(1);
    await expect(
      inspector.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 10, priceDzdPerKg: 10 }),
    ).rejects.toThrow("Only owners and managers can do this.");
  });
});

describe("public marketplace", () => {
  test("anyone sees open lots without signing in, with no contact details", async () => {
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    const p = await photo(t);
    const open = await list(f.as, f.id, { note: "Dry, in bags" });
    await f.as.mutation(api.market.createListing, { companyId: f.id, ...lot, residue: "date_pits", photoIds: [p] });
    const gone = await list(f.as, f.id);
    await f.as.mutation(api.market.withdrawListing, { listingId: gone });
    const sold = await list(f.as, f.id, { quantityKg: 10 });
    const offerId = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId: sold, quantityKg: 10, priceDzdPerKg: 15 });
    await f.as.mutation(api.market.respond, { offerId, accept: true });

    const lots = await t.query(api.market.publicLots, {});
    expect(lots.map((l) => l.residue)).toEqual(["date_pits", "olive_pomace"]); // newest first, open only
    expect(lots[0].photoUrls).toHaveLength(1);
    expect(lots[1]).toEqual({
      listingId: open,
      residue: "olive_pomace",
      remainingKg: 2000,
      priceDzdPerKg: 15,
      region: "Sétif",
      note: "Dry, in bags",
      photoUrls: [],
      sellerName: "Ferme Saïd",
      createdAt: expect.any(Number),
    });
    expect(JSON.stringify(lots)).not.toContain("555");
    // The signed-in view shows exactly the same lots.
    expect(await buyer.as.query(api.market.browse, {})).toEqual(lots);
  });

  test("a farmer can type a residue that is not in the list; it follows the lot to the sale", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@biorefmind.com");
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    await expect(list(f.as, f.id, { residue: "other" })).rejects.toThrow(
      "Type what you have (2 to 80 characters).",
    );
    const listingId = await list(f.as, f.id, { residue: "other", residueName: "  Dried lemon peels " });
    await list(f.as, f.id, { residueName: "ignored" });
    const [, mine] = await f.as.query(api.market.myListings, { companyId: f.id });
    expect(mine).toMatchObject({ listingId, residue: "other", residueName: "Dried lemon peels" });
    const lots = await t.query(api.market.publicLots, { residue: "other" });
    expect(lots).toMatchObject([{ listingId, residue: "other", residueName: "Dried lemon peels" }]);
    expect((await t.query(api.market.publicLots, {}))[0].residueName).toBeUndefined();

    const offerId = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 10, priceDzdPerKg: 15 });
    expect((await buyer.as.query(api.market.myOffers, { companyId: buyer.id }))[0]).toMatchObject({ residueName: "Dried lemon peels" });
    await f.as.mutation(api.market.respond, { offerId, accept: true });
    expect((await f.as.query(api.market.mySales, { companyId: f.id }))[0]).toMatchObject({ residue: "other", residueName: "Dried lemon peels" });
    expect((await buyer.as.query(api.market.mySales, { companyId: buyer.id }))[0]).toMatchObject({ residueName: "Dried lemon peels" });
    const boss = await member(t, "boss@biorefmind.com");
    expect((await boss.query(api.admin.sales, {})).recent[0]).toMatchObject({ residueName: "Dried lemon peels" });
    vi.unstubAllEnvs();
  });

  test("phone numbers cannot be typed into notes or offers, and old ones are masked", async () => {
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    await expect(list(f.as, f.id, { note: "Call 0555 12 34 56" })).rejects.toThrow(
      "Phone numbers can't be shared here: BiorefMind puts buyers and sellers in touch.",
    );
    const listingId = await list(f.as, f.id, { note: "Dry, in bags" });
    await expect(
      buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 10, priceDzdPerKg: 15, message: "ring +213 661 23 45 67" }),
    ).rejects.toThrow("Phone numbers can't be shared here: BiorefMind puts buyers and sellers in touch.");
    // A note saved before the rule: masked wherever others read it.
    await t.run((ctx) => ctx.db.patch(listingId, { note: "Dry, call 0661 23 45 67" }));
    expect((await t.query(api.market.publicLots, {}))[0].note).toBe("Dry, call •••");
    expect((await buyer.as.query(api.market.browse, {}))[0].note).toBe("Dry, call •••");
    const offerId = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg: 10, priceDzdPerKg: 15 });
    await t.run((ctx) => ctx.db.patch(offerId, { message: "my number 0550 11 22 33" }));
    const [mine] = await f.as.query(api.market.myListings, { companyId: f.id });
    expect(mine.offers[0].message).toBe("my number •••");
  });

  test("filters by residue; an unknown residue is just empty", async () => {
    const t = newBackend();
    const f = await farm(t);
    await list(f.as, f.id);
    await list(f.as, f.id, { residue: "date_pits" });
    expect(await t.query(api.market.publicLots, { residue: "date_pits" })).toMatchObject([{ residue: "date_pits" }]);
    expect(await t.query(api.market.publicLots, { residue: "nonsense" })).toEqual([]);
  });
});

describe("admin sales", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("admins see every sale and the fees owed; others are refused", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@biorefmind.com");
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    const l1 = await list(f.as, f.id);
    const l2 = await list(f.as, f.id, { residue: "date_pits", quantityKg: 100, priceDzdPerKg: 30 });
    for (const [listingId, quantityKg, priceDzdPerKg] of [
      [l1, 2000, 15],
      [l2, 100, 30],
    ] as const) {
      const offerId = await buyer.as.mutation(api.market.makeOffer, { companyId: buyer.id, listingId, quantityKg, priceDzdPerKg });
      await f.as.mutation(api.market.respond, { offerId, accept: true });
    }
    await expect(f.as.query(api.admin.sales, {})).rejects.toThrow("Only BiorefMind admins can do this.");
    const boss = await member(t, "boss@biorefmind.com");
    const s = await boss.query(api.admin.sales, {});
    expect(s).toMatchObject({ count: 2, totalDzd: 33_000, feeDzd: 1650 });
    expect(s.recent[0]).toMatchObject({
      residue: "date_pits",
      totalDzd: 3000,
      feeDzd: 150,
      seller: "Ferme Saïd",
      sellerPhone: "+213 555 11 11 11",
      buyer: "Peel Factory",
      buyerPhone: "+213 555 22 22 22",
    });
  });
});

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { beforeAll, describe, expect, test } from "vitest";
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

const DAY = 24 * 60 * 60 * 1000;

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
type Member = Awaited<ReturnType<typeof member>>;

async function company(t: Backend, kind: "farm" | "factory" | "lab", email: string, name: string) {
  const as = await member(t, email, `${name} owner`);
  const id = await as.mutation(api.companies.create, {
    kind,
    name,
    region: "Sétif",
    phone: "+213 555 11 11 11",
    services: kind === "lab" ? ["moisture", "punicalagin", "mold", "heavy_metals", "pectin"] : undefined,
  });
  return { as, id };
}

/** A lab with prices for moisture, punicalagin, mould and heavy metals (not pectin). */
async function pricedLab(t: Backend, email = "lab@x.dz", name = "Labo Nour") {
  const lab = await company(t, "lab", email, name);
  await lab.as.mutation(api.labs.updateSettings, {
    companyId: lab.id,
    address: "12 rue des Frères, Sétif",
    hours: "Sun–Thu 8:00–16:00",
    retention: "30 days",
    paused: false,
    prices: [
      { analysis: "moisture", priceDzd: 1500, days: 1 },
      { analysis: "punicalagin", priceDzd: 12000, days: 5 },
      { analysis: "mold", priceDzd: 3000, days: 3 },
      { analysis: "heavy_metals", priceDzd: 8000, days: 7 },
    ],
  });
  return lab;
}

/** Adds a member with a role straight into the workspace. */
async function addMember(t: Backend, companyId: Id<"companies">, email: string, role: "manager" | "inspector") {
  const as = await member(t, email, "Analyst Amina");
  await t.run(async (ctx) => {
    const u = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    await ctx.db.insert("memberships", { companyId, userId: u!._id, role, createdAt: Date.now() });
  });
  return as;
}

const sample = {
  residue: "pomegranate_peels",
  label: "Lot A dried",
  state: "dried",
  collectedAt: Date.now() - 2 * DAY,
  region: "Sétif",
  grams: 500,
};

function ask(
  as: Member,
  clientId: Id<"companies">,
  labId: Id<"companies">,
  extra: Partial<{ analyses: string[]; listingId: Id<"listings">; saleId: Id<"sales">; sample: typeof sample }> = {},
) {
  return as.mutation(api.labwork.request, {
    clientId,
    labId,
    analyses: ["punicalagin", "moisture", "mold"],
    sample,
    delivery: "dropoff",
    ...extra,
  });
}

const results = (from: number) => ({
  items: [
    { analysis: "punicalagin", value: 150, uncertainty: 9, method: "HPLC-DAD" },
    { analysis: "moisture", value: 8, method: "Oven 105 °C" },
    { analysis: "mold", value: 10, qualifier: "<" as const, method: "ISO 21527-2" },
  ],
  panels: [],
  testedFrom: from,
  testedTo: Date.now(),
});

async function received(t: Backend, requestId: Id<"labRequests">) {
  return (await t.run((ctx) => ctx.db.get(requestId)))!.receivedAt!;
}

describe("lab settings and directory", () => {
  test("prices, address, hours and pause show in the directory for signed-in users", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const [row] = await farm.as.query(api.labs.directory, {});
    expect(row).toMatchObject({
      name: "Labo Nour",
      address: "12 rue des Frères, Sétif",
      hours: "Sun–Thu 8:00–16:00",
      paused: false,
      prices: [
        { analysis: "moisture", priceDzd: 1500, days: 1 },
        { analysis: "punicalagin", priceDzd: 12000, days: 5 },
        { analysis: "mold", priceDzd: 3000, days: 3 },
        { analysis: "heavy_metals", priceDzd: 8000, days: 7 },
      ],
    });
    const [mine] = await lab.as.query(api.companies.mine, {});
    expect(mine).toMatchObject({ retention: "30 days", paused: false });
    expect(mine.prices).toHaveLength(4);
  });

  test("settings refusals and roles", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const base = { companyId: lab.id, address: "", hours: "", retention: "", paused: false, prices: [] };
    await expect(
      lab.as.mutation(api.labs.updateSettings, { ...base, prices: [{ analysis: "oxidation", priceDzd: 10, days: 1 }] }),
    ).rejects.toThrow("You can only price analyses your lab offers.");
    await expect(lab.as.mutation(api.labs.updateSettings, { ...base, address: "x".repeat(201) })).rejects.toThrow(
      "The address can be up to 200 characters.",
    );
    await expect(farm.as.mutation(api.labs.updateSettings, { ...base, companyId: farm.id })).rejects.toThrow(
      "That account is not a lab.",
    );
    const analyst = await addMember(t, lab.id, "analyst@x.dz", "inspector");
    await expect(analyst.mutation(api.labs.updateSettings, base)).rejects.toThrow("Only owners and managers can do this.");
  });

  test("removing an analysis from the services drops its price; old 'contamination' reads as heavy metals", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    await lab.as.mutation(api.companies.updateProfile, { companyId: lab.id, services: ["moisture"] });
    expect((await lab.as.query(api.companies.mine, {}))[0].prices).toEqual([{ analysis: "moisture", priceDzd: 1500, days: 1 }]);
    await t.run((ctx) => ctx.db.patch(lab.id, { services: ["contamination"] }));
    expect((await lab.as.query(api.companies.mine, {}))[0].services).toEqual(["heavy_metals"]);
  });
});

describe("the full flow", () => {
  test("farm requests for its lot → lab accepts, receives, analyst drafts, head releases → certificate → badge", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const analyst = await addMember(t, lab.id, "analyst@x.dz", "inspector");
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const listingId = await farm.as.mutation(api.market.createListing, {
      companyId: farm.id,
      residue: "pomegranate_peels",
      quantityKg: 2000,
      priceDzdPerKg: 30,
      photoIds: [],
    });

    const requestId = await ask(farm.as, farm.id, lab.id, { listingId });
    const [q] = await lab.as.query(api.labwork.labQueue, { companyId: lab.id });
    expect(q).toMatchObject({
      requestId,
      status: "requested",
      clientName: "Ferme Saïd",
      clientPhone: "+213 555 11 11 11",
      clientKind: "farm",
      totalDzd: 16500,
      analyses: [
        { analysis: "punicalagin", priceDzd: 12000, days: 5 },
        { analysis: "moisture", priceDzd: 1500, days: 1 },
        { analysis: "mold", priceDzd: 3000, days: 3 },
      ],
      paid: false,
    });
    const [mine] = await farm.as.query(api.labwork.myRequests, { companyId: farm.id });
    expect(mine).toMatchObject({ status: "requested", labName: "Labo Nour", labAddress: "12 rue des Frères, Sétif", listingId });

    await lab.as.mutation(api.labwork.respond, { requestId, accept: true });
    await expect(analyst.mutation(api.labwork.respond, { requestId, accept: true })).rejects.toThrow(
      "Only owners and managers can do this.",
    );
    await analyst.mutation(api.labwork.receive, { requestId, condition: "Dry, sealed bag" });
    const row = (await lab.as.query(api.labwork.labQueue, { companyId: lab.id }))[0];
    expect(row.status).toBe("received");
    expect(row.sampleNo).toMatch(/^S-\d{4}-0001$/);
    expect(row.dueAt! - row.receivedAt!).toBe(7 * DAY); // longest turnaround 5 working days

    const from = await received(t, requestId);
    await analyst.mutation(api.labwork.saveDraft, {
      requestId,
      results: { ...results(from), items: results(from).items.slice(0, 1) },
    });
    expect((await lab.as.query(api.labwork.labQueue, { companyId: lab.id }))[0].draft?.items).toHaveLength(1);
    await expect(analyst.mutation(api.labwork.release, { requestId, results: results(from) })).rejects.toThrow(
      "Only owners and managers can do this.",
    );
    await expect(
      lab.as.mutation(api.labwork.release, { requestId, results: { ...results(from), items: results(from).items.slice(0, 2) } }),
    ).rejects.toThrow("Enter a result for every analysis requested.");
    const code = await lab.as.mutation(api.labwork.release, { requestId, results: results(from) });

    // The certificate is public, frozen and has no score.
    const cert = await t.query(api.labwork.certificate, { code });
    expect(cert).toMatchObject({
      code,
      version: 1,
      lab: { name: "Labo Nour", address: "12 rue des Frères, Sétif" },
      client: { name: "Ferme Saïd", region: "Sétif" },
      sample: { label: "Lot A dried", state: "dried" },
      condition: "Dry, sealed bag",
      retention: "30 days",
      releasedByName: "Labo Nour owner",
      releasedByRole: "owner",
    });
    expect(cert!.reportNo).toBe(`${row.sampleNo}-R1`);
    expect(JSON.stringify(cert)).not.toContain("score");
    expect(cert!.client).toEqual({ name: "Ferme Saïd", region: "Sétif" }); // never the client's phone
    await lab.as.mutation(api.labs.updateSettings, {
      companyId: lab.id,
      address: "New address",
      hours: "",
      retention: "",
      paused: false,
      prices: [],
    });
    expect((await t.query(api.labwork.certificate, { code }))!.lab.address).toBe("12 rue des Frères, Sétif");
    expect(await t.query(api.labwork.certificate, { code: "NOPE" })).toBeNull();

    // No badge until the farm attaches the results.
    const factory = await company(t, "factory", "f@x.dz", "Peel Factory");
    expect((await t.query(api.market.publicLots, {}))[0].lab).toBeUndefined();
    await farm.as.mutation(api.market.attachLabReport, { listingId, requestId });
    const [pub] = await t.query(api.market.publicLots, {});
    expect(pub.lab).toMatchObject({ labName: "Labo Nour", route: "A" });
    expect(pub.lab!.score).toBeGreaterThanOrEqual(75);
    expect(JSON.stringify(pub.lab)).not.toContain(code);
    const [seen] = await factory.as.query(api.market.browse, {});
    expect(seen.lab!.code).toBe(code);
    expect((await farm.as.query(api.labwork.myRequests, { companyId: farm.id }))[0]).toMatchObject({
      status: "released",
      attached: true,
    });

    await farm.as.mutation(api.market.detachLabReport, { listingId });
    expect((await t.query(api.market.publicLots, {}))[0].lab).toBeUndefined();
  });

  test("an amendment adds version 2; version 1 says it was replaced; the badge follows the latest", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const listingId = await farm.as.mutation(api.market.createListing, {
      companyId: farm.id,
      residue: "pomegranate_peels",
      quantityKg: 100,
      priceDzdPerKg: 30,
      photoIds: [],
    });
    const requestId = await ask(farm.as, farm.id, lab.id, { listingId });
    await lab.as.mutation(api.labwork.respond, { requestId, accept: true });
    await lab.as.mutation(api.labwork.receive, { requestId });
    const from = await received(t, requestId);
    const v1 = await lab.as.mutation(api.labwork.release, { requestId, results: results(from) });
    await farm.as.mutation(api.market.attachLabReport, { listingId, requestId });
    await expect(
      lab.as.mutation(api.labwork.amend, { requestId, results: results(from), reason: " " }),
    ).rejects.toThrow("Please give a reason (up to 500 characters).");
    const worse = { ...results(from), items: results(from).items.map((i) => (i.analysis === "mold" ? { ...i, qualifier: undefined, value: 900_000 } : i)) };
    const v2 = await lab.as.mutation(api.labwork.amend, { requestId, results: worse, reason: "Plate count corrected" });
    expect(v2).not.toBe(v1);
    const c1 = await t.query(api.labwork.certificate, { code: v1 });
    const c2 = await t.query(api.labwork.certificate, { code: v2 });
    expect(c1!.replacedByCode).toBe(v2);
    expect(c2).toMatchObject({ version: 2, amendReason: "Plate count corrected" });
    expect(c2!.reportNo).toMatch(/-R2$/);
    expect((await t.query(api.market.publicLots, {}))[0].lab!.route).toBe("C");
    const q = (await lab.as.query(api.labwork.labQueue, { companyId: lab.id }))[0];
    expect(q.reports.map((r) => r.version)).toEqual([2, 1]);
  });

  test("a factory requests about a lot it bought; it can never publish the results", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const factory = await company(t, "factory", "f@x.dz", "Peel Factory");
    const listingId = await farm.as.mutation(api.market.createListing, {
      companyId: farm.id,
      residue: "pomegranate_peels",
      quantityKg: 1000,
      priceDzdPerKg: 30,
      photoIds: [],
    });
    const offerId = await factory.as.mutation(api.market.makeOffer, {
      companyId: factory.id,
      listingId,
      quantityKg: 500,
      priceDzdPerKg: 30,
    });
    await farm.as.mutation(api.market.respond, { offerId, accept: true });
    const saleId = (await t.run((ctx) => ctx.db.query("sales").first()))!._id;

    await expect(ask(factory.as, factory.id, lab.id, { listingId })).rejects.toThrow(
      "You can only request an analysis for your own lot.",
    );
    await expect(ask(farm.as, farm.id, lab.id, { saleId })).rejects.toThrow(
      "You can only request an analysis for a lot you bought.",
    );
    const requestId = await ask(factory.as, factory.id, lab.id, { saleId });
    expect((await factory.as.query(api.labwork.myRequests, { companyId: factory.id }))[0]).toMatchObject({
      saleId,
      listingId,
    });
    await lab.as.mutation(api.labwork.respond, { requestId, accept: true });
    await lab.as.mutation(api.labwork.receive, { requestId });
    await lab.as.mutation(api.labwork.release, { requestId, results: results(await received(t, requestId)) });
    await expect(farm.as.mutation(api.market.attachLabReport, { listingId, requestId })).rejects.toThrow(
      "These results are not about this lot.",
    );
  });
});

describe("request refusals", () => {
  test("who may ask, which lab, which analyses, which lot", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const other = await pricedLab(t, "lab2@x.dz", "Labo Deux");
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const stranger = await company(t, "farm", "s@x.dz", "Ferme Autre");

    await expect(ask(other.as, other.id, lab.id)).rejects.toThrow("Only farm and factory accounts can request analyses.");
    await expect(ask(stranger.as, farm.id, lab.id)).rejects.toThrow("You don't have access to this workspace.");
    await expect(ask(farm.as, farm.id, lab.id, { analyses: [] })).rejects.toThrow("Choose at least one analysis.");
    await expect(ask(farm.as, farm.id, lab.id, { analyses: ["pectin"] })).rejects.toThrow(
      "This lab has no price for one of the analyses you chose.",
    );
    await expect(ask(farm.as, farm.id, farm.id)).rejects.toThrow("This lab is not taking requests.");
    await expect(ask(farm.as, farm.id, lab.id, { sample: { ...sample, label: "x" } })).rejects.toThrow(
      "Give the sample a name (2 to 80 characters).",
    );

    const theirLot = await stranger.as.mutation(api.market.createListing, {
      companyId: stranger.id,
      residue: "olive_pomace",
      quantityKg: 10,
      priceDzdPerKg: 1,
      photoIds: [],
    });
    await expect(ask(farm.as, farm.id, lab.id, { listingId: theirLot })).rejects.toThrow(
      "You can only request an analysis for your own lot.",
    );
    const myLot = await farm.as.mutation(api.market.createListing, {
      companyId: farm.id,
      residue: "olive_pomace",
      quantityKg: 10,
      priceDzdPerKg: 1,
      photoIds: [],
    });
    await farm.as.mutation(api.market.withdrawListing, { listingId: myLot });
    await expect(ask(farm.as, farm.id, lab.id, { listingId: myLot })).rejects.toThrow("This lot is no longer open.");

    await lab.as.mutation(api.labs.updateSettings, {
      companyId: lab.id,
      address: "",
      hours: "",
      retention: "",
      paused: true,
      prices: [{ analysis: "moisture", priceDzd: 1500, days: 1 }],
    });
    await expect(ask(farm.as, farm.id, lab.id, { analyses: ["moisture"] })).rejects.toThrow(
      "This lab has paused new requests.",
    );
    await t.run((ctx) => ctx.db.patch(other.id, { trialEndsAt: Date.now() - 1 }));
    await expect(ask(farm.as, farm.id, other.id)).rejects.toThrow("This lab is not taking requests.");
  });

  test("each side sees only its own requests", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const other = await pricedLab(t, "lab2@x.dz", "Labo Deux");
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const stranger = await company(t, "farm", "s@x.dz", "Ferme Autre");
    const requestId = await ask(farm.as, farm.id, lab.id);
    expect(await other.as.query(api.labwork.labQueue, { companyId: other.id })).toEqual([]);
    expect(await stranger.as.query(api.labwork.myRequests, { companyId: stranger.id })).toEqual([]);
    await expect(other.as.mutation(api.labwork.respond, { requestId, accept: true })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
    await expect(stranger.as.mutation(api.labwork.cancel, { requestId })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
    await expect(farm.as.query(api.labwork.labQueue, { companyId: lab.id })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
  });
});

describe("lifecycle", () => {
  test("decline needs a reason; closed requests refuse every action", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const requestId = await ask(farm.as, farm.id, lab.id);
    await expect(lab.as.mutation(api.labwork.respond, { requestId, accept: false })).rejects.toThrow(
      "Please give a reason (up to 500 characters).",
    );
    await lab.as.mutation(api.labwork.respond, { requestId, accept: false, reason: "HPLC under repair" });
    expect((await farm.as.query(api.labwork.myRequests, { companyId: farm.id }))[0]).toMatchObject({
      status: "declined",
      reason: "HPLC under repair",
    });
    await expect(lab.as.mutation(api.labwork.receive, { requestId })).rejects.toThrow("This request is no longer open.");
    await expect(farm.as.mutation(api.labwork.cancel, { requestId })).rejects.toThrow("This request is no longer open.");
  });

  test("the client cancels before receipt; after receipt only the lab can, with a reason", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const a = await ask(farm.as, farm.id, lab.id);
    await lab.as.mutation(api.labwork.respond, { requestId: a, accept: true });
    await farm.as.mutation(api.labwork.setTracking, { requestId: a, tracking: "YAL-123456" });
    expect((await lab.as.query(api.labwork.labQueue, { companyId: lab.id }))[0].tracking).toBe("YAL-123456");
    await farm.as.mutation(api.labwork.cancel, { requestId: a });
    expect((await lab.as.query(api.labwork.labQueue, { companyId: lab.id }))[0].status).toBe("cancelled");

    const b = await ask(farm.as, farm.id, lab.id);
    await lab.as.mutation(api.labwork.respond, { requestId: b, accept: true });
    await lab.as.mutation(api.labwork.receive, { requestId: b });
    await expect(farm.as.mutation(api.labwork.cancel, { requestId: b })).rejects.toThrow(
      "The lab has the sample already; ask the lab to cancel.",
    );
    await lab.as.mutation(api.labwork.reject, { requestId: b, reason: "Sample arrived mouldy and warm" });
    const row = (await farm.as.query(api.labwork.myRequests, { companyId: farm.id })).find((r) => r.requestId === b)!;
    expect(row).toMatchObject({ status: "cancelled", reason: "Sample arrived mouldy and warm" });

    // The lab may also cancel an accepted request before the sample arrives.
    const c = await ask(farm.as, farm.id, lab.id);
    await lab.as.mutation(api.labwork.respond, { requestId: c, accept: true });
    await lab.as.mutation(api.labwork.reject, { requestId: c, reason: "Reagent out of stock" });
  });

  test("timeouts: unanswered after 7 days expires; a late sample can still be received", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const a = await ask(farm.as, farm.id, lab.id);
    await t.run((ctx) => ctx.db.patch(a, { createdAt: Date.now() - 8 * DAY }));
    const unanswered = (await farm.as.query(api.labwork.myRequests, { companyId: farm.id }))[0];
    expect(unanswered.status).toBe("expired");
    expect(unanswered.respondedAt).toBeUndefined(); // never answered
    await expect(lab.as.mutation(api.labwork.respond, { requestId: a, accept: true })).rejects.toThrow(
      "This request is no longer open.",
    );

    const b = await ask(farm.as, farm.id, lab.id);
    await lab.as.mutation(api.labwork.respond, { requestId: b, accept: true });
    await t.run((ctx) => ctx.db.patch(b, { respondedAt: Date.now() - 31 * DAY }));
    expect((await lab.as.query(api.labwork.labQueue, { companyId: lab.id })).find((r) => r.requestId === b)!.status).toBe(
      "expired",
    );
    const waited = (await farm.as.query(api.labwork.myRequests, { companyId: farm.id })).find((r) => r.requestId === b)!;
    expect(waited.status).toBe("expired");
    expect(waited.respondedAt).toBeDefined(); // accepted: the sample never came
    expect((await lab.as.query(api.labwork.labQueue, { companyId: lab.id })).find((r) => r.requestId === b)!.respondedAt).toBeDefined();
    await lab.as.mutation(api.labwork.receive, { requestId: b, dueAt: Date.now() + 10 * DAY });
    const row = (await lab.as.query(api.labwork.labQueue, { companyId: lab.id })).find((r) => r.requestId === b)!;
    expect(row.status).toBe("received");
    expect(row.overdue).toBe(false);
  });

  test("a lab whose plan lapsed: waiting requests show 'lab unavailable'; work in the lab continues", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const waiting = await ask(farm.as, farm.id, lab.id);
    const inLab = await ask(farm.as, farm.id, lab.id);
    await lab.as.mutation(api.labwork.respond, { requestId: inLab, accept: true });
    await lab.as.mutation(api.labwork.receive, { requestId: inLab });
    await t.run((ctx) => ctx.db.patch(lab.id, { trialEndsAt: Date.now() - 1 }));
    const rows = await farm.as.query(api.labwork.myRequests, { companyId: farm.id });
    expect(rows.find((r) => r.requestId === waiting)!.status).toBe("lab_unavailable");
    await expect(lab.as.mutation(api.labwork.respond, { requestId: waiting, accept: true })).rejects.toThrow(
      "This request is no longer open.",
    );
    const code = await lab.as.mutation(api.labwork.release, { requestId: inLab, results: results(await received(t, inLab)) });
    expect(await t.query(api.labwork.certificate, { code })).not.toBeNull();
  });

  test("the lab ticks a request paid; results cannot be released twice", async () => {
    const t = newBackend();
    const lab = await pricedLab(t);
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const requestId = await ask(farm.as, farm.id, lab.id);
    await lab.as.mutation(api.labwork.setPaid, { requestId, paid: true });
    expect((await lab.as.query(api.labwork.labQueue, { companyId: lab.id }))[0].paid).toBe(true);
    expect(JSON.stringify(await farm.as.query(api.labwork.myRequests, { companyId: farm.id }))).not.toContain("paid\":");
    await lab.as.mutation(api.labwork.respond, { requestId, accept: true });
    await lab.as.mutation(api.labwork.receive, { requestId });
    const from = await received(t, requestId);
    await lab.as.mutation(api.labwork.release, { requestId, results: results(from) });
    await expect(lab.as.mutation(api.labwork.release, { requestId, results: results(from) })).rejects.toThrow(
      "This request is no longer open.",
    );
    await expect(
      farm.as.mutation(api.market.attachLabReport, {
        listingId: await farm.as.mutation(api.market.createListing, {
          companyId: farm.id,
          residue: "pomegranate_peels",
          quantityKg: 10,
          priceDzdPerKg: 1,
          photoIds: [],
        }),
        requestId,
      }),
    ).rejects.toThrow("These results are not about this lot.");
  });
});

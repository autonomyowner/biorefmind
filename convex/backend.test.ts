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

function newBackend() {
  const t = convexTest(schema, modules);
  betterAuthTest.register(t);
  return t;
}
type Backend = ReturnType<typeof newBackend>;

/** A Better Auth login with a live session, the way `authComponent.safeGetAuthUser` finds it. */
async function login(t: Backend, email: string, name = email.split("@")[0]) {
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
  return t.withIdentity({ subject: userId, sessionId, email });
}

/** Login + profile. */
async function member(t: Backend, email: string, name = "Test User") {
  const as = await login(t, email);
  const userId = await as.mutation(api.users.ensureUser, { name });
  return { as, userId };
}

/** An owner with a fresh company. */
async function ownerWithCompany(t: Backend, email = "owner@factory.dz") {
  const o = await member(t, email, "Olga Owner");
  const companyId = await o.as.mutation(api.companies.create, { name: "Peel Factory", kind: "factory", region: "Sétif", phone: "0555123456" });
  return { ...o, companyId };
}

/** Invites `email` with `role` and signs them up. */
async function teammate(t: Backend, owner: Awaited<ReturnType<typeof ownerWithCompany>>, email: string, role: "manager" | "inspector") {
  await owner.as.mutation(api.companies.invite, { companyId: owner.companyId, email, role });
  return await member(t, email, role === "manager" ? "Mona Manager" : "Ivan Inspector");
}

const shipment = (companyId: Id<"companies">, over: Record<string, unknown> = {}) => ({
  companyId,
  crop: "pomegranate_peel",
  supplier: "Gabès Fruit Co.",
  weightKg: 1200,
  receivedAt: Date.now(),
  photoIds: [] as Id<"_storage">[],
  lab: { moisture: 12, mold: 0.5, oxidation: 20, punicalagin: 12.4 },
  ...over,
});

describe("users", () => {
  test("ensureUser creates once, then returns the same profile", async () => {
    const t = newBackend();
    const as = await login(t, "Ada@Lab.dz");
    expect(await as.query(api.users.viewer, {})).toBeNull();
    const id1 = await as.mutation(api.users.ensureUser, { name: "  Ada  " });
    const id2 = await as.mutation(api.users.ensureUser, { name: "Other" });
    expect(id2).toBe(id1);
    expect(await as.query(api.users.viewer, {})).toEqual({ _id: id1, email: "ada@lab.dz", name: "Ada", isAdmin: false });
  });

  test("ensureUser refuses an empty name and a signed-out caller", async () => {
    const t = newBackend();
    const as = await login(t, "a@b.dz");
    await expect(as.mutation(api.users.ensureUser, { name: "   " })).rejects.toThrow("Please enter your name.");
    await expect(t.mutation(api.users.ensureUser, { name: "X" })).rejects.toThrow("Please sign in to continue.");
    expect(await t.query(api.users.viewer, {})).toBeNull();
  });
});

describe("companies", () => {
  test("create makes the caller owner of a factory on enterprise pricing", async () => {
    const t = newBackend();
    const { as, companyId } = await ownerWithCompany(t);
    const mine = await as.query(api.companies.mine, {});
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ companyId, name: "Peel Factory", kind: "factory", role: "owner", plan: "enterprise" });
    expect(await t.query(api.companies.mine, {})).toEqual([]);
  });

  test("create refusals", async () => {
    const t = newBackend();
    const noProfile = await login(t, "new@x.dz");
    await expect(noProfile.mutation(api.companies.create, { name: "Good name", kind: "lab", region: "Sétif", phone: "0555123456", services: ["mold"] })).rejects.toThrow(
      "Please finish creating your account first.",
    );
    const { as } = await member(t, "m@x.dz");
    await expect(as.mutation(api.companies.create, { name: "A", kind: "lab", region: "Sétif", phone: "0555123456", services: ["mold"] })).rejects.toThrow(
      "Name must be 2–80 characters.",
    );
  });

  test("invite → sign up → member; role and validation refusals", async () => {
    const t = newBackend();
    const owner = await ownerWithCompany(t);
    const { companyId } = owner;
    await expect(owner.as.mutation(api.companies.invite, { companyId, email: "nope", role: "inspector" })).rejects.toThrow(
      "Please enter a valid email address.",
    );
    await owner.as.mutation(api.companies.invite, { companyId, email: "Ivan@X.dz", role: "inspector" });
    expect(await owner.as.query(api.companies.invitations, { companyId })).toMatchObject([
      { email: "ivan@x.dz", role: "inspector" },
    ]);

    const ivan = await member(t, "ivan@x.dz", "Ivan");
    expect(await ivan.as.query(api.companies.mine, {})).toMatchObject([{ companyId, role: "inspector" }]);
    expect(await owner.as.query(api.companies.invitations, { companyId })).toEqual([]);
    expect((await owner.as.query(api.companies.members, { companyId })).map((m) => m.role).sort()).toEqual([
      "inspector",
      "owner",
    ]);

    await expect(
      owner.as.mutation(api.companies.invite, { companyId, email: "ivan@x.dz", role: "manager" }),
    ).rejects.toThrow("This person is already in your workspace.");
    await expect(
      ivan.as.mutation(api.companies.invite, { companyId, email: "z@x.dz", role: "inspector" }),
    ).rejects.toThrow("Only owners and managers can invite people.");

    const outsider = await member(t, "out@x.dz");
    await expect(outsider.as.query(api.companies.members, { companyId })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
  });

  test("revokeInvitation: managers can, inspectors cannot", async () => {
    const t = newBackend();
    const owner = await ownerWithCompany(t);
    const inspector = await teammate(t, owner, "i@x.dz", "inspector");
    const manager = await teammate(t, owner, "m@x.dz", "manager");
    const inv = await manager.as.mutation(api.companies.invite, { companyId: owner.companyId, email: "p@x.dz", role: "inspector" });
    await expect(inspector.as.mutation(api.companies.revokeInvitation, { invitationId: inv })).rejects.toThrow(
      "Only owners and managers can invite people.",
    );
    await manager.as.mutation(api.companies.revokeInvitation, { invitationId: inv });
    expect(await owner.as.query(api.companies.invitations, { companyId: owner.companyId })).toEqual([]);
    // A revoked invitation is not accepted on sign-up.
    const p = await member(t, "p@x.dz");
    expect(await p.as.query(api.companies.mine, {})).toEqual([]);
  });
});

describe("shipments", () => {
  test("create scores and numbers shipments per company", async () => {
    const t = newBackend();
    const { as, companyId } = await ownerWithCompany(t);
    const a = await as.mutation(api.shipments.create, shipment(companyId));
    const b = await as.mutation(api.shipments.create, shipment(companyId));
    expect(a.code).toBe("BG-000001");
    expect(b.code).toBe("BG-000002");
    expect(a.result).toMatchObject({ score: 82.5, route: "A", confidence: 0.9 });

    const other = await ownerWithCompany(t, "o2@x.dz");
    const c = await other.as.mutation(api.shipments.create, shipment(other.companyId));
    expect(c.code).toBe("BG-000001");
  });

  test("create validation texts", async () => {
    const t = newBackend();
    const { as, companyId } = await ownerWithCompany(t);
    const cases: [Record<string, unknown>, string][] = [
      [{ supplier: "  " }, "Please enter the supplier."],
      [{ weightKg: 0 }, "Weight must be a positive number."],
      [{ weightKg: Number.POSITIVE_INFINITY }, "Weight must be a positive number."],
      [{ lab: { mold: 120 } }, "Lab values must be percentages between 0 and 100."],
      [{ lab: { moisture: -1 } }, "Lab values must be percentages between 0 and 100."],
      [{ crop: "banana" }, "Unknown crop."],
    ];
    for (const [over, text] of cases) {
      await expect(as.mutation(api.shipments.create, shipment(companyId, over))).rejects.toThrow(text);
    }
    const photo = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      as.mutation(api.shipments.create, shipment(companyId, { photoIds: Array(9).fill(photo) })),
    ).rejects.toThrow("You can attach up to 8 photos.");
    const outsider = await member(t, "out@x.dz");
    await expect(outsider.as.mutation(api.shipments.create, shipment(companyId))).rejects.toThrow(
      "You don't have access to this workspace.",
    );
  });

  test("list: newest first, route filter, case-insensitive search, limit", async () => {
    const t = newBackend();
    const { as, companyId } = await ownerWithCompany(t);
    const now = Date.now();
    await as.mutation(api.shipments.create, shipment(companyId, { supplier: "Kabylie Agro", receivedAt: now - 3000 }));
    await as.mutation(api.shipments.create, shipment(companyId, { supplier: "Delta Press", receivedAt: now - 1000, lab: { mold: 9 } }));
    await as.mutation(api.shipments.create, shipment(companyId, { supplier: "Oasis", receivedAt: now - 2000 }));

    const all = await as.query(api.shipments.list, { companyId });
    expect(all.map((r) => r.supplier)).toEqual(["Delta Press", "Oasis", "Kabylie Agro"]);
    expect(all[0]).toMatchObject({ route: "C", autoRoute: "C", overridden: false, thumbUrl: null });

    expect((await as.query(api.shipments.list, { companyId, route: "C" })).map((r) => r.supplier)).toEqual(["Delta Press"]);
    expect((await as.query(api.shipments.list, { companyId, search: "kabY" })).map((r) => r.supplier)).toEqual(["Kabylie Agro"]);
    expect((await as.query(api.shipments.list, { companyId, search: "bg-000003" })).map((r) => r.code)).toEqual(["BG-000003"]);
    expect(await as.query(api.shipments.list, { companyId, limit: 2 })).toHaveLength(2);
  });

  test("get returns the detail for members and null for another company", async () => {
    const t = newBackend();
    const { as, companyId } = await ownerWithCompany(t);
    const { shipmentId } = await as.mutation(api.shipments.create, shipment(companyId, { lab: { moisture: 16, punicalagin: 12 } }));
    const d = await as.query(api.shipments.get, { shipmentId });
    expect(d).toMatchObject({ code: "BG-000001", createdByName: "Olga Owner", overrides: [], photoUrls: [] });
    expect(d!.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(d!.recommendations.length).toBeLessThanOrEqual(4);
    expect(d!.recommendations.some((r) => r.includes("dry below 10 %"))).toBe(true);

    const other = await ownerWithCompany(t, "o2@x.dz");
    expect(await other.as.query(api.shipments.get, { shipmentId })).toBeNull();
  });

  test("override: any role, logged, overridden flag follows autoRoute", async () => {
    const t = newBackend();
    const owner = await ownerWithCompany(t);
    const inspector = await teammate(t, owner, "i@x.dz", "inspector");
    const { shipmentId } = await owner.as.mutation(api.shipments.create, shipment(owner.companyId));

    await expect(
      inspector.as.mutation(api.shipments.override, { shipmentId, to: "B", reason: "no" }),
    ).rejects.toThrow("Please give a reason for the change (at least 5 characters).");
    await expect(
      inspector.as.mutation(api.shipments.override, { shipmentId, to: "A", reason: "same route" }),
    ).rejects.toThrow("The shipment is already on that route.");

    await inspector.as.mutation(api.shipments.override, { shipmentId, to: "B", reason: "Wet corner of the lot" });
    let d = await owner.as.query(api.shipments.get, { shipmentId });
    expect(d).toMatchObject({ route: "B", autoRoute: "A", overridden: true });
    expect(d!.overrides).toMatchObject([{ from: "A", to: "B", reason: "Wet corner of the lot", userName: "Ivan Inspector" }]);

    await owner.as.mutation(api.shipments.override, { shipmentId, to: "A", reason: "Re-tested, all fine" });
    d = await owner.as.query(api.shipments.get, { shipmentId });
    expect(d).toMatchObject({ route: "A", overridden: false });
    expect(d!.overrides).toHaveLength(2);

    // An outsider learns nothing about whether the shipment exists.
    const outsider = await member(t, "out@x.dz");
    await expect(
      outsider.as.mutation(api.shipments.override, { shipmentId, to: "C", reason: "sneaky change" }),
    ).rejects.toThrow("This shipment no longer exists.");
    const other = await ownerWithCompany(t, "o2@x.dz");
    await expect(other.as.mutation(api.shipments.remove, { shipmentId })).rejects.toThrow(
      "This shipment no longer exists.",
    );
  });

  test("create refuses a photo already attached to another company's shipment", async () => {
    const t = newBackend();
    const a = await ownerWithCompany(t);
    const b = await ownerWithCompany(t, "o2@x.dz");
    const photo = await t.run((ctx) => ctx.storage.store(new Blob(["img"])));
    await a.as.mutation(api.shipments.create, shipment(a.companyId, { photoIds: [photo] }));
    await expect(
      b.as.mutation(api.shipments.create, shipment(b.companyId, { photoIds: [photo] })),
    ).rejects.toThrow("One of the photos could not be found. Please upload it again.");
    // Deleting a shipment deletes its photos, so a photo belongs to one shipment only.
    await expect(
      a.as.mutation(api.shipments.create, shipment(a.companyId, { photoIds: [photo] })),
    ).rejects.toThrow("One of the photos could not be found. Please upload it again.");
  });

  test("remove: owners and managers only, deletes photos and overrides", async () => {
    const t = newBackend();
    const owner = await ownerWithCompany(t);
    const inspector = await teammate(t, owner, "i@x.dz", "inspector");
    const manager = await teammate(t, owner, "m@x.dz", "manager");
    const photo = await t.run((ctx) => ctx.storage.store(new Blob(["img"])));
    const { shipmentId } = await owner.as.mutation(api.shipments.create, shipment(owner.companyId, { photoIds: [photo] }));
    expect((await owner.as.query(api.shipments.list, { companyId: owner.companyId }))[0].thumbUrl).toBeTypeOf("string");
    await owner.as.mutation(api.shipments.override, { shipmentId, to: "C", reason: "Smells off" });

    await expect(inspector.as.mutation(api.shipments.remove, { shipmentId })).rejects.toThrow(
      "Only owners and managers can delete shipments.",
    );
    await manager.as.mutation(api.shipments.remove, { shipmentId });
    const left = await t.run(async (ctx) => ({
      shipment: await ctx.db.get(shipmentId),
      overrides: await ctx.db.query("routeOverrides").collect(),
      photo: await ctx.db.system.get(photo),
    }));
    expect(left).toEqual({ shipment: null, overrides: [], photo: null });
  });
});

describe("analytics.overview", () => {
  test("counts, averages, trend and suppliers", async () => {
    const t = newBackend();
    const { as, companyId } = await ownerWithCompany(t);
    const now = Date.now();
    // A 82.5 / B 61.5 / C (gate) / an old one outside 30 days
    const a = await as.mutation(api.shipments.create, shipment(companyId, { supplier: "S1" }));
    await as.mutation(api.shipments.create, shipment(companyId, { supplier: "S1", lab: { moisture: 12, mold: 2, oxidation: 20, punicalagin: 8 } }));
    await as.mutation(api.shipments.create, shipment(companyId, { supplier: "S2", lab: {} }));
    await as.mutation(api.shipments.create, shipment(companyId, { supplier: "S2", lab: {}, receivedAt: now - 40 * 86_400_000 }));
    await as.mutation(api.shipments.override, { shipmentId: a.shipmentId, to: "B", reason: "Customer request" });

    const o = await as.query(api.analytics.overview, { companyId });
    expect(o.total).toBe(4);
    expect(o.last30).toBe(3);
    expect(o.byRoute).toEqual({ A: 0, B: 2, C: 2 });
    expect(o.avgScore).toBe(36); // (82.5 + 61.5 + 0 + 0) / 4
    expect(o.avgConfidence).toBe(0.58); // (0.9 + 1 + 0.2 + 0.2) / 4 = 0.575
    expect(o.overrideRate).toBe(0.25);
    expect(o.trend).toHaveLength(30);
    expect(o.trend.at(-1)).toEqual({ day: new Date(now).toISOString().slice(0, 10), count: 3, avgScore: 48 });
    expect(o.suppliers).toEqual([
      { supplier: "S1", count: 2, avgScore: 72, shareA: 0 },
      { supplier: "S2", count: 2, avgScore: 0, shareA: 0 },
    ]);
    expect(o.recent).toHaveLength(4);
  });
});

describe("demo.score", () => {
  test("public, same engine, range refusal", async () => {
    const t = newBackend();
    expect(await t.query(api.demo.score, { lab: { moisture: 12, mold: 0.5, oxidation: 20, punicalagin: 12.4 } })).toMatchObject({
      score: 82.5,
      route: "A",
    });
    await expect(t.query(api.demo.score, { lab: { mold: 101 } })).rejects.toThrow(
      "Lab values must be percentages between 0 and 100.",
    );
  });
});

describe("seed.demoData", () => {
  test("owner adds 40 shipments over 30 days from 6 suppliers; others are refused", async () => {
    const t = newBackend();
    const owner = await ownerWithCompany(t);
    const manager = await teammate(t, owner, "m@x.dz", "manager");
    await expect(manager.as.mutation(api.seed.demoData, { companyId: owner.companyId })).rejects.toThrow(
      "Only the workspace owner can add demo data.",
    );
    expect(await owner.as.mutation(api.seed.demoData, { companyId: owner.companyId })).toEqual({ created: 40 });
    const o = await owner.as.query(api.analytics.overview, { companyId: owner.companyId });
    expect(o.total).toBe(40);
    expect(o.last30).toBe(40);
    expect(o.suppliers).toHaveLength(6);
    expect(o.byRoute.A).toBeGreaterThan(0);
    expect(o.byRoute.B).toBeGreaterThan(0);
    expect(o.byRoute.C).toBeGreaterThan(0);
    expect(o.overrideRate).toBeGreaterThan(0);
  });
});

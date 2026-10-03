/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { api, components } from "./_generated/api";
import schema from "./schema";
import { addMonths } from "./lib/pricing";

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

const base = { region: "Sétif", phone: "+213 555 12 34 56" };

describe("companies per kind", () => {
  test("farm, lab and factory get their plan and fields", async () => {
    const t = newBackend();
    const farmer = await member(t, "farmer@x.dz");
    await farmer.mutation(api.companies.create, { kind: "farm", name: "Ferme Saïd", ...base });
    const lab = await member(t, "lab@x.dz");
    await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold", "zzz", "moisture"] });
    const factory = await member(t, "f@x.dz");
    await factory.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", ...base, buys: ["olive_pomace"] });

    expect((await farmer.query(api.companies.mine, {}))[0]).toMatchObject({
      kind: "farm",
      plan: "free",
      region: "Sétif",
      phone: base.phone,
    });
    const l = (await lab.query(api.companies.mine, {}))[0];
    expect(l).toMatchObject({ kind: "lab", plan: "lab_trial", services: ["moisture", "mold"], listed: true });
    expect(l.trialEndsAt! - Date.now()).toBeGreaterThan(13.9 * 86_400_000);
    expect((await factory.query(api.companies.mine, {}))[0]).toMatchObject({
      kind: "factory",
      plan: "enterprise",
      buys: ["olive_pomace"],
    });
  });

  test("refusals", async () => {
    const t = newBackend();
    const as = await member(t, "a@x.dz");
    await expect(as.mutation(api.companies.create, { kind: "farm", name: "A", ...base })).rejects.toThrow(
      "Name must be 2–80 characters.",
    );
    await expect(
      as.mutation(api.companies.create, { kind: "farm", name: "Ferme", region: " ", phone: base.phone }),
    ).rejects.toThrow("Please enter your region.");
    await expect(
      as.mutation(api.companies.create, { kind: "farm", name: "Ferme", region: "Sétif", phone: "123" }),
    ).rejects.toThrow("Please enter a phone number.");
    await expect(
      as.mutation(api.companies.create, { kind: "lab", name: "Labo", ...base, services: ["nope"] }),
    ).rejects.toThrow("Choose at least one analysis your lab offers.");
    await as.mutation(api.companies.create, { kind: "farm", name: "Ferme", ...base });
    await expect(as.mutation(api.companies.create, { kind: "farm", name: "Ferme 2", ...base })).rejects.toThrow(
      "You already have a farm account.",
    );
    const [farm] = await as.query(api.companies.mine, {});
    await expect(
      as.mutation(api.companies.invite, { companyId: farm.companyId, email: "b@x.dz", role: "manager" }),
    ).rejects.toThrow("Farm accounts are for one person.");
  });

  test("updateProfile checks fields and roles", async () => {
    const t = newBackend();
    const lab = await member(t, "lab@x.dz");
    const id = await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold"] });
    await lab.mutation(api.companies.updateProfile, { companyId: id, name: "Labo Nour Sétif", services: ["moisture"] });
    expect((await lab.query(api.companies.mine, {}))[0]).toMatchObject({ name: "Labo Nour Sétif", services: ["moisture"] });
    await expect(lab.mutation(api.companies.updateProfile, { companyId: id, services: [] })).rejects.toThrow(
      "Choose at least one analysis your lab offers.",
    );
    const other = await member(t, "o@x.dz");
    await expect(other.mutation(api.companies.updateProfile, { companyId: id, name: "Hijack" })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
  });
});

describe("directory, enterprise, admin", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("directory lists labs in trial or paid, filters by analysis", async () => {
    const t = newBackend();
    const lab = await member(t, "lab@x.dz");
    const labId = await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold"] });
    const viewer = await member(t, "v@x.dz");
    expect(await viewer.query(api.labs.directory, {})).toMatchObject([
      { companyId: labId, name: "Labo Nour", services: ["mold"] },
    ]);
    expect(await viewer.query(api.labs.directory, { service: "moisture" })).toEqual([]);
    await t.run(async (ctx) => ctx.db.patch(labId, { trialEndsAt: Date.now() - 1 }));
    expect(await viewer.query(api.labs.directory, {})).toEqual([]);
    await expect(t.query(api.labs.directory, {})).rejects.toThrow("Please sign in to continue.");
  });

  test("enterprise request: factories only, message checked", async () => {
    const t = newBackend();
    const f = await member(t, "f@x.dz");
    const fid = await f.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", ...base });
    await expect(f.mutation(api.enterprise.request, { companyId: fid, message: "  " })).rejects.toThrow(
      "Please write a short message (up to 1000 characters).",
    );
    await f.mutation(api.enterprise.request, { companyId: fid, message: "We buy 40 t a month." });
    const farmer = await member(t, "farmer@x.dz");
    const farm = await farmer.mutation(api.companies.create, { kind: "farm", name: "Ferme", ...base });
    await expect(farmer.mutation(api.enterprise.request, { companyId: farm, message: "Hi" })).rejects.toThrow(
      "Only factory accounts can request enterprise pricing.",
    );
  });

  test("admin: refused for others, overview and mark paid for admins", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@biorefmind.com");
    const t = newBackend();
    const lab = await member(t, "lab@x.dz");
    const labId = await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold"] });
    await expect(lab.query(api.admin.overview, {})).rejects.toThrow("Only BiorefMind admins can do this.");
    expect(await lab.query(api.users.viewer, {})).toMatchObject({ isAdmin: false });

    const boss = await member(t, "Boss@BiorefMind.com");
    expect(await boss.query(api.users.viewer, {})).toMatchObject({ isAdmin: true });
    const o = await boss.query(api.admin.overview, {});
    expect(o.accounts).toMatchObject([{ companyId: labId, kind: "lab", ownerEmail: "lab@x.dz", listed: true }]);

    await t.run(async (ctx) => ctx.db.patch(labId, { trialEndsAt: Date.now() - 1 }));
    const until = Date.now() + 30 * 86_400_000;
    await boss.mutation(api.admin.setLabPaidUntil, { companyId: labId, paidUntil: until });
    expect((await lab.query(api.companies.mine, {}))[0]).toMatchObject({ plan: "lab_paid", paidUntil: until, listed: true });

    const f = await member(t, "f@x.dz");
    const fid = await f.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", ...base });
    await f.mutation(api.enterprise.request, { companyId: fid, message: "We buy 40 t a month." });
    expect((await boss.query(api.admin.overview, {})).requests).toMatchObject([
      { company: "Peel Factory", email: "f@x.dz", message: "We buy 40 t a month." },
    ]);
    await expect(boss.mutation(api.admin.setLabPaidUntil, { companyId: fid, paidUntil: until })).rejects.toThrow(
      "That account is not a lab.",
    );
  });

  test("admin: extend a lab by months, end its plan", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@biorefmind.com");
    const t = newBackend();
    const lab = await member(t, "lab@x.dz");
    const labId = await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold"] });
    const boss = await member(t, "boss@biorefmind.com");

    await expect(lab.mutation(api.admin.extendLab, { companyId: labId, months: 1 })).rejects.toThrow(
      "Only BiorefMind admins can do this.",
    );
    for (const months of [0, 13, 1.5]) {
      await expect(boss.mutation(api.admin.extendLab, { companyId: labId, months })).rejects.toThrow(
        "Choose between 1 and 12 months.",
      );
    }

    // Paying during the trial adds the month after the trial ends.
    const trialEnd = (await lab.query(api.companies.mine, {}))[0].trialEndsAt!;
    const { paidUntil } = await boss.mutation(api.admin.extendLab, { companyId: labId, months: 1 });
    expect(paidUntil).toBe(addMonths(trialEnd, 1));
    expect((await lab.query(api.companies.mine, {}))[0]).toMatchObject({ plan: "lab_paid", paidUntil, listed: true });

    // A second payment stacks on the paid period.
    const again = await boss.mutation(api.admin.extendLab, { companyId: labId, months: 3 });
    expect(again.paidUntil).toBe(addMonths(paidUntil, 3));

    await boss.mutation(api.admin.endLabPlan, { companyId: labId });
    expect((await lab.query(api.companies.mine, {}))[0]).toMatchObject({ plan: "lab_paid", listed: false });

    // After it ended, extending starts from today.
    const before = Date.now();
    const fresh = await boss.mutation(api.admin.extendLab, { companyId: labId, months: 1 });
    expect(fresh.paidUntil).toBeGreaterThanOrEqual(addMonths(before, 1));
    expect(fresh.paidUntil).toBeLessThanOrEqual(addMonths(Date.now(), 1));

    const f = await member(t, "f@x.dz");
    const fid = await f.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", ...base });
    await expect(boss.mutation(api.admin.extendLab, { companyId: fid, months: 1 })).rejects.toThrow("That account is not a lab.");
    await expect(boss.mutation(api.admin.endLabPlan, { companyId: fid })).rejects.toThrow("That account is not a lab.");
  });
});

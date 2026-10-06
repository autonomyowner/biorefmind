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

async function company(t: Backend, kind: "farm" | "factory" | "lab", email: string, name: string) {
  const as = await member(t, email, `${name} owner`);
  const id: Id<"companies"> = await as.mutation(api.companies.create, {
    kind,
    name,
    region: "Sétif",
    phone: "+213 555 11 11 11",
    services: kind === "lab" ? ["moisture", "mold"] : undefined,
  });
  return { as, id };
}

describe("insights.workspace", () => {
  test("a farm and a factory see the same sale from their own side", async () => {
    const t = newBackend();
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const factory = await company(t, "factory", "f@x.dz", "Peel Factory");
    const listingId = await farm.as.mutation(api.market.createListing, {
      companyId: farm.id,
      residue: "olive_pomace",
      quantityKg: 2000,
      priceDzdPerKg: 15,
      photoIds: [],
    });
    const offerId = await factory.as.mutation(api.market.makeOffer, {
      companyId: factory.id,
      listingId,
      quantityKg: 1000,
      priceDzdPerKg: 15,
    });
    await farm.as.mutation(api.market.respond, { offerId, accept: true });

    const f = await farm.as.query(api.insights.workspace, { companyId: farm.id, days: 7 });
    expect(f.kind).toBe("farm");
    expect(f.kpis.map((k) => [k.key, k.value])).toEqual([
      ["soldDzd", 15_000],
      ["soldKg", 1000],
      ["sales", 1],
      ["avgDzdPerKg", 15],
    ]);
    expect(f.series.current).toHaveLength(7);
    expect(f.series.current[6]).toBe(15_000);
    expect(f.breakdown).toEqual([{ key: "olive_pomace", value: 15_000 }]);
    expect(f.top).toEqual([{ name: "Peel Factory", value: 15_000, count: 1 }]);
    expect(f.ring).toBe(0.5);
    expect(f.activity).toHaveLength(140);

    const b = await factory.as.query(api.insights.workspace, { companyId: factory.id, days: 30 });
    expect(b.kind).toBe("factory");
    expect(b.kpis.map((k) => [k.key, k.value])).toEqual([
      ["spentDzd", 15_750],
      ["boughtKg", 1000],
      ["offersSent", 1],
      ["acceptRate", 1],
      ["avgDzdPerKg", 15],
    ]);
    expect(b.top).toEqual([{ name: "Ferme Saïd", value: 15_000, count: 1 }]);
    expect(b.ring).toBe(1);
  });

  test("a lab counts its requests and analyses", async () => {
    const t = newBackend();
    const lab = await company(t, "lab", "lab@x.dz", "Labo Nour");
    await lab.as.mutation(api.labs.updateSettings, {
      companyId: lab.id,
      address: "12 rue des Frères, Sétif",
      hours: "Sun–Thu 8:00–16:00",
      retention: "30 days",
      paused: false,
      prices: [
        { analysis: "moisture", priceDzd: 1500, days: 1 },
        { analysis: "mold", priceDzd: 3000, days: 3 },
      ],
    });
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    await farm.as.mutation(api.labwork.request, {
      clientId: farm.id,
      labId: lab.id,
      analyses: ["moisture", "mold"],
      sample: { residue: "pomegranate_peels", label: "Lot A", state: "dried", collectedAt: Date.now(), region: "Sétif", grams: 500 },
      delivery: "dropoff",
    });

    const r = await lab.as.query(api.insights.workspace, { companyId: lab.id, days: 90 });
    expect(r.kind).toBe("lab");
    expect(r.kpis.map((k) => [k.key, k.value])).toEqual([
      ["requests", 1],
      ["released", 0],
      ["revenueDzd", 0],
      ["avgTurnaroundDays", 0],
    ]);
    expect(r.series.current).toHaveLength(90);
    expect(r.breakdown).toEqual([
      { key: "moisture", value: 1 },
      { key: "mold", value: 1 },
    ]);
    expect(r.top).toEqual([{ name: "Ferme Saïd", value: 4500, count: 1 }]);
    expect(r.ring).toBeNull();
  });

  test("refusals: outsiders, signed-out visitors, other ranges", async () => {
    const t = newBackend();
    const farm = await company(t, "farm", "farm@x.dz", "Ferme Saïd");
    const other = await company(t, "factory", "f@x.dz", "Peel Factory");
    await expect(other.as.query(api.insights.workspace, { companyId: farm.id, days: 7 })).rejects.toThrow(
      "You don't have access to this workspace.",
    );
    await expect(t.query(api.insights.workspace, { companyId: farm.id, days: 7 })).rejects.toThrow("Please sign in to continue.");
    await expect(farm.as.query(api.insights.workspace, { companyId: farm.id, days: 14 })).rejects.toThrow("Choose 7, 30 or 90 days.");
  });
});

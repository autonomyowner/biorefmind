/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { AI_REFUSE, DAILY_CAP, DEFAULT_MODEL, FARM_DAILY_CAP } from "./lib/ai";

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
type Member = Awaited<ReturnType<typeof member>>;

async function farm(t: Backend, email = "farmer@x.dz") {
  const as = await member(t, email);
  const id = await as.mutation(api.companies.create, { kind: "farm", name: "Ferme Saïd", region: "Sétif", phone: "+213 555 11 11 11" });
  return { as, id };
}

async function factory(t: Backend) {
  const as = await member(t, "f@x.dz");
  const id = await as.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", region: "Blida", phone: "+213 555 22 22 22" });
  return { as, id };
}

async function admin(t: Backend) {
  return await member(t, "boss@biorefmind.com", "Boss");
}

async function photo(t: Backend): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => ctx.storage.store(new Blob(["jpeg"], { type: "image/jpeg" })));
}

async function post(t: Backend, as: Member, companyId: Id<"companies">, photos = 2) {
  const photoIds = [];
  for (let i = 0; i < photos; i++) photoIds.push(await photo(t));
  return await as.mutation(api.market.createListing, {
    companyId,
    residue: "pomegranate_peels",
    quantityKg: 1000,
    priceDzdPerKg: 18,
    note: "Dried in the sun",
    photoIds,
  });
}

const answer = {
  match: "yes",
  seen: { en: "Dried pomegranate peels.", ar: "قشور رمان مجففة." },
  state: "dried",
  concerns: ["browning"],
  tip: { en: "Add a close-up.", ar: "أضف صورة قريبة." },
};

function okResponse(cost = 0.004) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }], usage: { cost } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => impl(String(url), init));
  vi.stubGlobal("fetch", fetchMock);
}
const bodyOf = (call: number) => JSON.parse(String(fetchMock.mock.calls[call][1]?.body));
const authOf = (call: number) => (fetchMock.mock.calls[call][1]?.headers as Record<string, string>).Authorization;

/** Runs the scheduled photo check(s) to the end. */
async function runChecks(t: Backend) {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-envkey0000000000000");
  vi.stubEnv("ADMIN_EMAILS", "boss@biorefmind.com");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("photo check", () => {
  test("posting with photos → pending → done, shown to the farmer, in browse and on the public page", async () => {
    stubFetch(() => okResponse());
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    await post(t, f.as, f.id, 2);

    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toEqual({ status: "pending" });
    expect((await t.query(api.market.publicLots, {}))[0].photoCheck).toBeUndefined();

    await runChecks(t);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(authOf(0)).toBe("Bearer sk-or-v1-envkey0000000000000");
    const body = bodyOf(0);
    expect(body.model).toBe(DEFAULT_MODEL);
    expect(body.response_format.type).toBe("json_schema");
    const parts = body.messages[1].content as { type: string }[];
    expect(parts.filter((p) => p.type === "image_url")).toHaveLength(2);
    // Nothing about the farm itself leaves BiorefMind.
    const sent = JSON.stringify(body);
    for (const secret of ["Ferme Saïd", "Sétif", "555", "Dried in the sun"]) expect(sent).not.toContain(secret);

    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toEqual({ status: "done", result: answer });
    expect((await buyer.as.query(api.market.browse, {}))[0].photoCheck).toEqual(answer);
    expect((await t.query(api.market.publicLots, {}))[0].photoCheck).toEqual(answer);
  });

  test("a lot without photos gets no check", async () => {
    stubFetch(() => okResponse());
    const t = newBackend();
    const f = await farm(t);
    await post(t, f.as, f.id, 0);
    await runChecks(t);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toBeUndefined();
  });

  test("switched off, or no key at all → off: nothing public, no call", async () => {
    stubFetch(() => okResponse());
    const t = newBackend();
    const boss = await admin(t);
    const f = await farm(t);
    await boss.mutation(api.ai.update, { photoCheck: false });
    await post(t, f.as, f.id);
    await runChecks(t);

    await boss.mutation(api.ai.update, { photoCheck: true });
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await post(t, f.as, f.id);
    await runChecks(t);

    expect(fetchMock).not.toHaveBeenCalled();
    const mine = await f.as.query(api.market.myListings, { companyId: f.id });
    expect(mine.map((l) => l.photoCheck)).toEqual([{ status: "off" }, { status: "off" }]);
    expect((await t.query(api.market.publicLots, {})).map((l) => l.photoCheck)).toEqual([undefined, undefined]);
  });

  test("the daily cap turns new checks off", async () => {
    stubFetch(() => okResponse());
    const t = newBackend();
    const f = await farm(t);
    const other = (await farm(t, "other@x.dz")).id; // the day's checks were other farms'
    const listingId = await post(t, f.as, f.id, 0);
    await t.run(async (ctx) => {
      for (let i = 0; i < DAILY_CAP; i++) {
        await ctx.db.insert("photoChecks", { listingId, companyId: other, status: "done", attempts: 1, createdAt: Date.now() });
      }
    });
    await post(t, f.as, f.id);
    await runChecks(t);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toEqual({ status: "off" });
  });

  test("the daily cap ignores checks that were off (they cost nothing)", async () => {
    stubFetch(() => okResponse());
    const t = newBackend();
    const f = await farm(t);
    const listingId = await post(t, f.as, f.id, 0);
    await t.run(async (ctx) => {
      for (let i = 0; i < DAILY_CAP + 5; i++) {
        await ctx.db.insert("photoChecks", { listingId, companyId: f.id, status: "off", attempts: 0, createdAt: Date.now() });
      }
    });
    await post(t, f.as, f.id);
    await runChecks(t);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("one farm gets at most FARM_DAILY_CAP checks a day", async () => {
    stubFetch(() => okResponse());
    const t = newBackend();
    const f = await farm(t);
    const other = await farm(t, "other@x.dz");
    const listingId = await post(t, f.as, f.id, 0);
    await t.run(async (ctx) => {
      for (let i = 0; i < FARM_DAILY_CAP; i++) {
        await ctx.db.insert("photoChecks", { listingId, companyId: f.id, status: "done", attempts: 1, createdAt: Date.now() });
      }
    });
    await post(t, f.as, f.id);
    await post(t, other.as, other.id);
    await runChecks(t);
    expect(fetchMock).toHaveBeenCalledOnce(); // only the other farm's lot
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toEqual({ status: "off" });
    expect((await other.as.query(api.market.myListings, { companyId: other.id }))[0].photoCheck?.status).toBe("done");
  });

  test("a check stuck pending for over 10 minutes shows as failed and can be retried", async () => {
    stubFetch(() => okResponse());
    const t = newBackend();
    const f = await farm(t);
    const listingId = await post(t, f.as, f.id);
    // The scheduled run never happens (e.g. the action died); age the check by 11 minutes.
    await t.run(async (ctx) => {
      const check = await ctx.db.query("photoChecks").first();
      await ctx.db.patch(check!._id, { queuedAt: Date.now() - 11 * 60_000 });
    });
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toEqual({ status: "failed" });
    await f.as.mutation(api.photoCheck.retry, { listingId });
    await runChecks(t);
    expect((await t.query(api.market.publicLots, {}))[0].photoCheck).toEqual(answer);
  });

  test("calls carry a timeout; a typed residue goes as data, not instructions", async () => {
    stubFetch(() => okResponse());
    const t = newBackend();
    const f = await farm(t);
    await f.as.mutation(api.market.createListing, {
      companyId: f.id,
      residue: "other",
      residueName: "Fig leaves",
      quantityKg: 10,
      priceDzdPerKg: 5,
      photoIds: [await photo(t)],
    });
    await runChecks(t);
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    const body = bodyOf(0);
    expect(body.messages[0].content).not.toContain("Fig leaves");
    expect(JSON.stringify(body.messages[1].content)).toContain("Fig leaves");
  });

  test("retry refuses a lot that is no longer open", async () => {
    stubFetch(() => new Response("down", { status: 503 }));
    const t = newBackend();
    const f = await farm(t);
    const listingId = await post(t, f.as, f.id);
    await runChecks(t);
    await f.as.mutation(api.market.withdrawListing, { listingId });
    await expect(f.as.mutation(api.photoCheck.retry, { listingId })).rejects.toThrow("This listing is no longer open.");
  });

  test("two failed attempts → failed; the farmer retries (3 a day), others cannot", async () => {
    stubFetch(() => new Response("down", { status: 503 }));
    const t = newBackend();
    const f = await farm(t);
    const buyer = await factory(t);
    const listingId = await post(t, f.as, f.id);
    await runChecks(t);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toEqual({ status: "failed" });
    expect((await t.query(api.market.publicLots, {}))[0].photoCheck).toBeUndefined();

    await expect(buyer.as.mutation(api.photoCheck.retry, { listingId })).rejects.toThrow("You don't have access to this workspace.");

    // A model answer that doesn't fit the shape also fails.
    stubFetch(() => new Response(JSON.stringify({ choices: [{ message: { content: "sorry" } }] }), { status: 200 }));
    await f.as.mutation(api.photoCheck.retry, { listingId });
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toEqual({ status: "pending" });
    await runChecks(t);
    expect((await f.as.query(api.market.myListings, { companyId: f.id }))[0].photoCheck).toEqual({ status: "failed" });

    stubFetch(() => new Response("down", { status: 500 }));
    await f.as.mutation(api.photoCheck.retry, { listingId });
    await runChecks(t);
    await f.as.mutation(api.photoCheck.retry, { listingId });
    await runChecks(t);
    await expect(f.as.mutation(api.photoCheck.retry, { listingId })).rejects.toThrow(AI_REFUSE.retries);

    // Next day the farmer can try again, and it works.
    await t.run(async (ctx) => {
      const check = await ctx.db.query("photoChecks").first();
      await ctx.db.patch(check!._id, { retryDay: check!.retryDay! - 1 });
    });
    stubFetch(() => okResponse());
    await f.as.mutation(api.photoCheck.retry, { listingId });
    await runChecks(t);
    expect((await t.query(api.market.publicLots, {}))[0].photoCheck).toEqual(answer);
    await expect(f.as.mutation(api.photoCheck.retry, { listingId })).rejects.toThrow(AI_REFUSE.notFailed);
  });
});

describe("admin AI settings", () => {
  test("only admins see or change them", async () => {
    const t = newBackend();
    const f = await farm(t);
    for (const call of [
      () => f.as.query(api.ai.settings, {}),
      () => f.as.mutation(api.ai.saveKey, { key: "sk-or-v1-abcdef0123456789" }),
      () => f.as.mutation(api.ai.removeKey, {}),
      () => f.as.mutation(api.ai.update, { photoCheck: false }),
      () => f.as.action(api.ai.testKey, {}),
    ]) {
      await expect(call()).rejects.toThrow("Only BiorefMind admins can do this.");
    }
  });

  test("a saved key is masked, wins over the server setting, and can be removed", async () => {
    stubFetch(() => okResponse(0.0025));
    const t = newBackend();
    const boss = await admin(t);
    expect(await boss.query(api.ai.settings, {})).toEqual({
      keySource: "env",
      keyMasked: "sk-or-…0000",
      model: DEFAULT_MODEL,
      photoCheck: true,
      month: { done: 0, failed: 0, costUsd: 0 },
    });

    await expect(boss.mutation(api.ai.saveKey, { key: "nope" })).rejects.toThrow(AI_REFUSE.key);
    await boss.mutation(api.ai.saveKey, { key: " sk-or-v1-savedkey1234567890abcd " });
    await expect(boss.mutation(api.ai.update, { model: "gemini" })).rejects.toThrow(AI_REFUSE.model);
    await boss.mutation(api.ai.update, { model: "openai/gpt-5-mini" });
    const s = await boss.query(api.ai.settings, {});
    expect(s).toMatchObject({ keySource: "saved", keyMasked: "sk-or-…abcd", model: "openai/gpt-5-mini" });
    expect(JSON.stringify(s)).not.toContain("savedkey");

    const f = await farm(t);
    await post(t, f.as, f.id);
    await runChecks(t);
    expect(authOf(0)).toBe("Bearer sk-or-v1-savedkey1234567890abcd");
    expect(bodyOf(0).model).toBe("openai/gpt-5-mini");
    expect((await boss.query(api.ai.settings, {})).month).toEqual({ done: 1, failed: 0, costUsd: 0.0025 });

    await boss.mutation(api.ai.removeKey, {});
    expect(await boss.query(api.ai.settings, {})).toMatchObject({ keySource: "env", keyMasked: "sk-or-…0000" });
    vi.stubEnv("OPENROUTER_API_KEY", "");
    expect(await boss.query(api.ai.settings, {})).toMatchObject({ keySource: "none", keyMasked: "" });
  });

  test("Test key reports usage and limit, or the problem in plain words", async () => {
    const t = newBackend();
    const boss = await admin(t);
    stubFetch(() => new Response(JSON.stringify({ data: { usage: 1.25, limit: 20 } }), { status: 200 }));
    expect(await boss.action(api.ai.testKey, {})).toEqual({ ok: true, usageUsd: 1.25, limitUsd: 20 });
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://openrouter.ai/api/v1/key");

    stubFetch(() => new Response("{}", { status: 401 }));
    expect(await boss.action(api.ai.testKey, {})).toEqual({ ok: false, error: "OpenRouter refused the key (401)." });

    vi.stubEnv("OPENROUTER_API_KEY", "");
    expect(await boss.action(api.ai.testKey, {})).toEqual({ ok: false, error: "No key saved." });
  });

  test("the assistant uses the saved key and model", async () => {
    stubFetch(() => new Response(JSON.stringify({ choices: [{ message: { content: "Hello" } }] }), { status: 200 }));
    const t = newBackend();
    const boss = await admin(t);
    await boss.mutation(api.ai.saveKey, { key: "sk-or-v1-savedkey1234567890abcd" });
    const f = await factory(t);
    const { answer: a } = await f.as.action(api.assistant.ask, { companyId: f.id, question: "Hi" });
    expect(a).toBe("Hello");
    expect(authOf(0)).toBe("Bearer sk-or-v1-savedkey1234567890abcd");
    expect(bodyOf(0).model).toBe(DEFAULT_MODEL);
  });
});

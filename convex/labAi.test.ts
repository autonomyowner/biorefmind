/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { READ_REFUSE, LAB_DAILY_READS } from "./lib/aiRead";

const modules = import.meta.glob("./**/*.*s");

beforeAll(async () => {
  await Promise.all(
    Object.entries(modules)
      .filter(([p]) => !p.endsWith("convex.config.ts") && !p.includes("_generated/") && !p.includes(".test."))
      .map(([, load]) => load()),
  );
}, 180_000);

const DAY = 86_400_000;

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

async function company(t: Backend, kind: "farm" | "lab", email: string, name: string) {
  const as = await member(t, email, `${name} owner`);
  const id = await as.mutation(api.companies.create, {
    kind,
    name,
    region: "Sétif",
    phone: "+213 555 11 11 11",
    services: kind === "lab" ? ["moisture", "punicalagin", "mold", "heavy_metals"] : undefined,
  });
  return { as, id };
}

/** A lab, a farm, and a request for moisture + punicalagin + heavy metals that the lab has received. */
async function receivedRequest(t: Backend, labEmail = "lab@x.dz") {
  const lab = await company(t, "lab", labEmail, "Labo Nour");
  await lab.as.mutation(api.labs.updateSettings, {
    companyId: lab.id,
    address: "12 rue des Frères, Sétif",
    hours: "Sun–Thu 8:00–16:00",
    retention: "30 days",
    paused: false,
    prices: [
      { analysis: "moisture", priceDzd: 1500, days: 1 },
      { analysis: "punicalagin", priceDzd: 12000, days: 5 },
      { analysis: "heavy_metals", priceDzd: 8000, days: 7 },
    ],
  });
  const farm = await company(t, "farm", `farm-${labEmail}`, "Ferme Saïd");
  const requestId = await farm.as.mutation(api.labwork.request, {
    clientId: farm.id,
    labId: lab.id,
    analyses: ["moisture", "punicalagin", "heavy_metals"],
    sample: { residue: "pomegranate_peels", label: "Lot A dried", state: "dried", collectedAt: Date.now() - 2 * DAY, region: "Sétif", grams: 500 },
    delivery: "dropoff",
  });
  await lab.as.mutation(api.labwork.respond, { requestId, accept: true });
  await lab.as.mutation(api.labwork.receive, { requestId, condition: "Dry, sealed bag" });
  return { lab, farm, requestId };
}

const MAGIC: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  "text/html": [0x3c, 0x68, 0x74, 0x6d],
};
/** A stored file whose first bytes match `type`. */
async function upload(t: Backend, type = "image/jpeg", bytes = 2_000): Promise<Id<"_storage">> {
  const data = new Uint8Array(bytes);
  data.set(MAGIC[type]);
  return await t.run(async (ctx) => ctx.storage.store(new Blob([data], { type })));
}

const today = () => new Date().toISOString().slice(0, 10);
const answer = () => ({
  items: [
    { analysis: "moisture", value: 9.4, qualifier: "none", uncertainty: 0.3 },
    { analysis: "punicalagin", value: 132, qualifier: "none", uncertainty: 0 },
  ],
  panels: [{ analysis: "heavy_metals", lines: [{ name: "Lead (Pb)", value: 0.05, qualifier: "<", unit: "mg/kg" }] }],
  testedFrom: today(),
  testedTo: today(),
  notes: [],
});

let fetchMock: ReturnType<typeof vi.fn>;
function stubFetch(impl: () => Response) {
  fetchMock = vi.fn(async () => impl());
  vi.stubGlobal("fetch", fetchMock);
}
const ok = (cost = 0.004) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer()) } }], usage: { cost } }), { status: 200 });
const bodyOf = (call = 0) => JSON.parse(String(fetchMock.mock.calls[call][1]?.body));

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-envkey0000000000000");
  vi.stubEnv("ADMIN_EMAILS", "boss@biorefmind.com");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("results reader", () => {
  test("a lab reads a photo of its sheet: values come back, the photo is deleted, nothing is saved", async () => {
    stubFetch(() => ok());
    const t = newBackend();
    const { lab, requestId } = await receivedRequest(t);
    const file = await upload(t);

    const reading = await lab.as.action(api.labAi.readResults, { requestId, files: [file] });
    expect(reading).toEqual({
      items: [
        { analysis: "moisture", value: 9.4, uncertainty: 0.3 },
        { analysis: "punicalagin", value: 132 },
      ],
      panels: [{ analysis: "heavy_metals", lines: [{ name: "Lead (Pb)", value: 0.05, qualifier: "<", unit: "mg/kg" }] }],
      testedFrom: today(),
      testedTo: today(),
      notes: [],
    });

    const body = bodyOf();
    expect(body.response_format.json_schema.schema.properties.items.items.properties.analysis.enum).toEqual(["moisture", "punicalagin"]);
    const parts = body.messages[1].content as { type: string; image_url?: { url: string } }[];
    expect(parts.find((p) => p.type === "image_url")?.image_url?.url.startsWith("data:image/jpeg;base64,")).toBe(true);
    const sent = JSON.stringify(body.messages[0]) + JSON.stringify(parts.filter((p) => p.type === "text"));
    for (const secret of ["Ferme Saïd", "Labo Nour", "555", "Lot A"]) expect(sent).not.toContain(secret);

    await t.run(async (ctx) => {
      expect(await ctx.storage.get(file)).toBeNull();
      expect(await ctx.db.query("photoClaims").collect()).toEqual([]);
      const reads = await ctx.db.query("aiReads").collect();
      expect(reads).toMatchObject([{ status: "done", costUsd: 0.004 }]);
      expect((await ctx.db.get(requestId))?.draft).toBeUndefined();
    });

    const boss = await member(t, "boss@biorefmind.com");
    expect((await boss.query(api.ai.settings, {})).month).toMatchObject({ reads: 1, costUsd: 0.004 });
  });

  test("a PDF goes as a file", async () => {
    stubFetch(() => ok());
    const t = newBackend();
    const { lab, requestId } = await receivedRequest(t);
    await lab.as.action(api.labAi.readResults, { requestId, files: [await upload(t, "application/pdf")] });
    const parts = bodyOf().messages[1].content as { type: string; file?: { file_data: string } }[];
    expect(parts.find((p) => p.type === "file")?.file?.file_data.startsWith("data:application/pdf;base64,")).toBe(true);
  });

  test("who and when: other labs, clients, requests not in the lab, bad files", async () => {
    stubFetch(() => ok());
    const t = newBackend();
    const { lab, farm, requestId } = await receivedRequest(t);
    const other = await company(t, "lab", "other@x.dz", "Labo B");
    const file = await upload(t);

    await expect(other.as.action(api.labAi.readResults, { requestId, files: [file] })).rejects.toThrow("You don't have access to this workspace.");
    await expect(farm.as.action(api.labAi.readResults, { requestId, files: [file] })).rejects.toThrow("You don't have access to this workspace.");
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [] })).rejects.toThrow(READ_REFUSE.files);
    const html = await upload(t, "text/html");
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [html] })).rejects.toThrow(READ_REFUSE.fileType);
    expect(fetchMock).not.toHaveBeenCalled();
    await t.run(async (ctx) => {
      expect(await ctx.storage.get(html)).toBeNull(); // refused files are deleted too
      expect(await ctx.db.query("aiReads").collect()).toEqual([]); // and don't count against the day
    });

    // A lot photo another company owns can be neither read nor deleted.
    const lotPhoto = await upload(t);
    await t.run((ctx) => ctx.db.insert("photoClaims", { storageId: lotPhoto, companyId: farm.id }));
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [lotPhoto] })).rejects.toThrow(
      "One of the photos could not be found. Please upload it again.",
    );
    await t.run(async (ctx) => {
      expect(await ctx.storage.get(lotPhoto)).not.toBeNull();
    });

    await lab.as.mutation(api.labwork.release, {
      requestId,
      results: {
        items: [
          { analysis: "moisture", value: 9, method: "Oven 105 °C" },
          { analysis: "punicalagin", value: 130, method: "HPLC-DAD" },
        ],
        panels: [{ analysis: "heavy_metals", method: "ICP-OES", lines: [{ name: "Lead (Pb)", value: 0.05, unit: "mg/kg" }] }],
        testedFrom: Date.now() - 60_000,
        testedTo: Date.now(),
      },
    });
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [await upload(t)] })).rejects.toThrow("This request is no longer open.");
  });

  test("switched off, no key, or over the lab's daily readings → refused before any call", async () => {
    stubFetch(() => ok());
    const t = newBackend();
    const { lab, requestId } = await receivedRequest(t);
    const boss = await member(t, "boss@biorefmind.com");

    await boss.mutation(api.ai.update, { resultsReader: false });
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [await upload(t)] })).rejects.toThrow(READ_REFUSE.off);
    await boss.mutation(api.ai.update, { resultsReader: true });

    vi.stubEnv("OPENROUTER_API_KEY", "");
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [await upload(t)] })).rejects.toThrow(READ_REFUSE.off);
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-envkey0000000000000");

    await t.run(async (ctx) => {
      for (let i = 0; i < LAB_DAILY_READS; i++) {
        await ctx.db.insert("aiReads", { labId: lab.id, requestId, status: "done", createdAt: Date.now() });
      }
    });
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [await upload(t)] })).rejects.toThrow(READ_REFUSE.limit);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a failing model → plain refusal, the photo is still deleted", async () => {
    stubFetch(() => new Response("down", { status: 503 }));
    const t = newBackend();
    const { lab, requestId } = await receivedRequest(t);
    const file = await upload(t);
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [file] })).rejects.toThrow(READ_REFUSE.failed);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await t.run(async (ctx) => {
      expect(await ctx.storage.get(file)).toBeNull();
      expect(await ctx.db.query("aiReads").collect()).toMatchObject([{ status: "failed" }]);
    });
  });

  test("files too big are refused before anything is read", async () => {
    stubFetch(() => ok());
    const t = newBackend();
    const { lab, requestId } = await receivedRequest(t);
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: [await upload(t, "image/jpeg", 9_000_000)] })).rejects.toThrow(
      READ_REFUSE.fileType,
    );
    const four = [];
    for (let i = 0; i < 3; i++) four.push(await upload(t, "image/jpeg", 4_500_000)); // 13.5 MB together
    await expect(lab.as.action(api.labAi.readResults, { requestId, files: four })).rejects.toThrow(READ_REFUSE.fileType);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a reading whose action died is closed and its pages deleted after 15 minutes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const t = newBackend();
      const { lab, requestId } = await receivedRequest(t);
      const file = await upload(t);
      // The state `start` leaves (claimed page, pending reading, scheduled safety net), then the action dies.
      await t.run(async (ctx) => {
        const { internal } = await import("./_generated/api");
        await ctx.db.insert("photoClaims", { storageId: file, companyId: lab.id });
        const readId = await ctx.db.insert("aiReads", { labId: lab.id, requestId, status: "pending", createdAt: Date.now() });
        await ctx.scheduler.runAfter(15 * 60_000, internal.labAi.expire, { readId, files: [file] });
      });
      vi.advanceTimersByTime(16 * 60_000);
      await t.finishInProgressScheduledFunctions();
      await t.run(async (ctx) => {
        expect(await ctx.storage.get(file)).toBeNull();
        expect(await ctx.db.query("aiReads").collect()).toMatchObject([{ status: "failed" }]);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  test("the upload address refuses early when the reader is off or the day is used up", async () => {
    const t = newBackend();
    const { lab, requestId } = await receivedRequest(t);
    const boss = await member(t, "boss@biorefmind.com");
    await boss.mutation(api.ai.update, { resultsReader: false });
    await expect(lab.as.mutation(api.labAi.uploadUrl, { requestId })).rejects.toThrow(READ_REFUSE.off);
    await boss.mutation(api.ai.update, { resultsReader: true });
    await t.run(async (ctx) => {
      for (let i = 0; i < LAB_DAILY_READS; i++) await ctx.db.insert("aiReads", { labId: lab.id, requestId, status: "done", createdAt: Date.now() });
    });
    await expect(lab.as.mutation(api.labAi.uploadUrl, { requestId })).rejects.toThrow(READ_REFUSE.limit);
  });

  test("the upload address is for lab members only", async () => {
    const t = newBackend();
    const { lab, farm, requestId } = await receivedRequest(t);
    expect(typeof (await lab.as.mutation(api.labAi.uploadUrl, { requestId }))).toBe("string");
    await expect(farm.as.mutation(api.labAi.uploadUrl, { requestId })).rejects.toThrow("You don't have access to this workspace.");
  });
});

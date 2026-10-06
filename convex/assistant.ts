import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { resolveConfig } from "./ai";
import { requireMember, requireUser } from "./lib/access";
import { labListed } from "./lib/accounts";
import { OPENROUTER_URL, utcDay } from "./lib/ai";
import { LAB_DAILY_READS, parseReading, readingPrompt, readingValidator, readSchema, sniffType, type Reading } from "./lib/aiRead";
import {
  ASSIST_REFUSE,
  CALL_TIMEOUT_MS,
  cleanAnswer,
  cleanCard,
  cleanQuestion,
  cleanTitle,
  HISTORY_MESSAGES,
  MAX_PHOTO_BYTES,
  PHOTOS_PER_DAY,
  PHOTOS_PER_MESSAGE,
  QUESTIONS_PER_DAY,
  StreamReader,
  STUCK_AFTER_MS,
  systemPrompt,
  titleFrom,
  TOOL_ROUNDS,
  toolsFor,
  type StoredCard,
} from "./lib/assistant";
import { MARKET_REFUSE } from "./lib/market";

// The dashboard assistant. Design and contract: docs/superpowers/specs/2026-10-06-ai-assistant-design.md
// A conversation belongs to one person in one workspace. The model only sees that workspace's data (through
// assistantTools) and public market data; its proposals become cards the person confirms in the normal forms.

const dayStart = (now: number) => utcDay(now) * 86_400_000;

/** The caller's own thread, or the "no longer exists" refusal (also for other people's threads). */
async function ownThread(ctx: QueryCtx | MutationCtx, threadId: Id<"aiThreads">) {
  const user = await requireUser(ctx);
  const thread = await ctx.db.get(threadId);
  if (!thread || thread.userId !== user._id) throw new ConvexError(ASSIST_REFUSE.noThread);
  await requireMember(ctx, thread.companyId);
  return { user, thread };
}

/** "streaming" for too long means the run died: shown and retried as failed. */
const statusOf = (m: Doc<"aiMessages">, now: number) => (m.status === "streaming" && now - m.createdAt > STUCK_AFTER_MS ? "failed" : m.status);

async function on(ctx: QueryCtx) {
  const cfg = await resolveConfig(ctx);
  if (!cfg.assistant || !cfg.key) throw new ConvexError(ASSIST_REFUSE.off);
  return cfg;
}

/* ---------- Reading ---------- */

export const threads = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const { user } = await requireMember(ctx, companyId);
    const rows = await ctx.db
      .query("aiThreads")
      .withIndex("by_user_company", (q) => q.eq("userId", user._id).eq("companyId", companyId))
      .order("desc")
      .take(50);
    return rows.map((r) => ({ threadId: r._id, title: r.title, updatedAt: r.updatedAt }));
  },
});

export const messages = query({
  args: { threadId: v.id("aiThreads") },
  handler: async (ctx, { threadId }) => {
    await ownThread(ctx, threadId);
    const now = Date.now();
    const rows = await ctx.db
      .query("aiMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("asc")
      .take(200);
    const out = [];
    for (const m of rows) {
      const photos = [];
      for (const storageId of m.photoIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) photos.push({ storageId, url });
      }
      out.push({
        messageId: m._id,
        role: m.role,
        text: m.text,
        photos,
        steps: m.steps,
        cards: m.cards,
        status: statusOf(m, now),
        createdAt: m.createdAt,
      });
    }
    return out;
  },
});

/** One card, for the form it opens (with photo URLs for a listing). */
export const card = query({
  args: { messageId: v.id("aiMessages"), index: v.number() },
  handler: async (ctx, { messageId, index }) => {
    const user = await requireUser(ctx);
    const msg = await ctx.db.get(messageId);
    const thread = msg ? await ctx.db.get(msg.threadId) : null;
    const c = msg?.cards[index];
    if (!msg || !thread || thread.userId !== user._id || !c) throw new ConvexError(ASSIST_REFUSE.noCard);
    await requireMember(ctx, thread.companyId);
    const photos = [];
    if (c.type === "listing") {
      for (const storageId of c.photoIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) photos.push({ storageId, url });
      }
    }
    return { ...c, photos };
  },
});

/* ---------- Writing ---------- */

export const uploadUrl = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireMember(ctx, companyId);
    await on(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const send = mutation({
  args: { companyId: v.id("companies"), threadId: v.optional(v.id("aiThreads")), text: v.string(), photoIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    let thread: Doc<"aiThreads"> | null = null;
    if (args.threadId) thread = (await ownThread(ctx, args.threadId)).thread;
    const { user, company } = await requireMember(ctx, args.companyId);
    if (thread && thread.companyId !== company._id) throw new ConvexError(ASSIST_REFUSE.noThread);
    await on(ctx);
    const photoIds = [...new Set(args.photoIds)];
    if (photoIds.length > PHOTOS_PER_MESSAGE) throw new ConvexError(ASSIST_REFUSE.photos);
    const text = cleanQuestion(args.text, photoIds.length);
    const now = Date.now();

    if (thread) {
      const last = await ctx.db
        .query("aiMessages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .order("desc")
        .first();
      if (last && statusOf(last, now) === "streaming") throw new ConvexError(ASSIST_REFUSE.busy);
    }

    // The workspace's day: questions and photos.
    const today = await ctx.db
      .query("aiMessages")
      .withIndex("by_company_created", (q) => q.eq("companyId", company._id).gte("createdAt", dayStart(now)))
      .filter((q) => q.eq(q.field("role"), "user"))
      .collect();
    if (today.length >= QUESTIONS_PER_DAY) throw new ConvexError(ASSIST_REFUSE.limit);
    if (photoIds.length && today.reduce((n, m) => n + m.photoIds.length, 0) + photoIds.length > PHOTOS_PER_DAY) {
      throw new ConvexError(ASSIST_REFUSE.photoLimit);
    }

    // Photos: fresh uploads only, small enough; claimed for this workspace as assistant photos.
    for (const id of photoIds) {
      const meta = await ctx.db.system.get(id);
      const claimed = await ctx.db
        .query("photoClaims")
        .withIndex("by_storage", (q) => q.eq("storageId", id))
        .first();
      if (!meta || claimed) throw new ConvexError(MARKET_REFUSE.photoMissing);
      if (meta.size > MAX_PHOTO_BYTES) throw new ConvexError(ASSIST_REFUSE.photos);
    }
    for (const id of photoIds) await ctx.db.insert("photoClaims", { storageId: id, companyId: company._id, source: "assistant" });

    const threadId =
      thread?._id ??
      (await ctx.db.insert("aiThreads", { companyId: company._id, userId: user._id, title: titleFrom(text, photoIds.length > 0), updatedAt: now }));
    if (thread) await ctx.db.patch(thread._id, { updatedAt: now });
    const base = { threadId, companyId: company._id, steps: [], cards: [] };
    await ctx.db.insert("aiMessages", { ...base, role: "user", text, photoIds, status: "done", createdAt: now });
    const messageId = await ctx.db.insert("aiMessages", { ...base, role: "assistant", text: "", photoIds: [], status: "streaming", createdAt: now + 1 });
    await ctx.scheduler.runAfter(0, internal.assistant.run, { messageId });
    return { threadId, messageId };
  },
});

/** "Try again" on a failed answer (the last message of the thread). */
export const retry = mutation({
  args: { messageId: v.id("aiMessages") },
  handler: async (ctx, { messageId }) => {
    const msg = await ctx.db.get(messageId);
    if (!msg) throw new ConvexError(ASSIST_REFUSE.noThread);
    await ownThread(ctx, msg.threadId);
    await on(ctx);
    const last = await ctx.db
      .query("aiMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", msg.threadId))
      .order("desc")
      .first();
    if (msg.role !== "assistant" || last?._id !== messageId || statusOf(msg, Date.now()) !== "failed") throw new ConvexError(ASSIST_REFUSE.busy);
    await ctx.db.patch(messageId, { text: "", steps: [], cards: [], status: "streaming", createdAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.assistant.run, { messageId });
    return null;
  },
});

export const rename = mutation({
  args: { threadId: v.id("aiThreads"), title: v.string() },
  handler: async (ctx, { threadId, title }) => {
    await ownThread(ctx, threadId);
    await ctx.db.patch(threadId, { title: cleanTitle(title) });
    return null;
  },
});

/** Deletes the conversation and its photos, except photos a lot now uses. */
export const remove = mutation({
  args: { threadId: v.id("aiThreads") },
  handler: async (ctx, { threadId }) => {
    const { thread } = await ownThread(ctx, threadId);
    const rows = await ctx.db
      .query("aiMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();
    for (const m of rows) {
      for (const id of m.photoIds) {
        const claim = await ctx.db
          .query("photoClaims")
          .withIndex("by_storage", (q) => q.eq("storageId", id))
          .first();
        if (claim?.source === "assistant" && claim.companyId === thread.companyId) {
          await ctx.db.delete(claim._id);
          await ctx.storage.delete(id);
        }
      }
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(threadId);
    return null;
  },
});

/* ---------- The run (internal) ---------- */

export const load = internalQuery({
  args: { messageId: v.id("aiMessages") },
  handler: async (ctx, { messageId }) => {
    const msg = await ctx.db.get(messageId);
    if (!msg || msg.status !== "streaming") return null;
    const [thread, company] = await Promise.all([ctx.db.get(msg.threadId), ctx.db.get(msg.companyId)]);
    const user = thread ? await ctx.db.get(thread.userId) : null;
    if (!thread || !company || !user) return null;
    const history = (
      await ctx.db
        .query("aiMessages")
        .withIndex("by_thread", (q) => q.eq("threadId", msg.threadId))
        .order("desc")
        .take(HISTORY_MESSAGES + 1)
    )
      .filter((m) => m._id !== messageId && m.createdAt <= msg.createdAt && (m.role === "user" || m.status === "done"))
      .reverse()
      .map((m) => ({ role: m.role, text: m.text, photoIds: m.photoIds }));
    const cfg = await resolveConfig(ctx);
    return {
      companyId: company._id,
      kind: company.kind,
      workspace: company.name,
      firstName: user.name.split(" ")[0] || user.name,
      history,
      key: cfg.assistant ? cfg.key : undefined,
      model: cfg.model,
    };
  },
});

export const write = internalMutation({
  args: { messageId: v.id("aiMessages"), text: v.string() },
  handler: async (ctx, { messageId, text }) => {
    const m = await ctx.db.get(messageId);
    if (m?.status === "streaming") await ctx.db.patch(messageId, { text: cleanAnswer(text) });
    return null;
  },
});

export const step = internalMutation({
  args: { messageId: v.id("aiMessages"), tool: v.string(), detail: v.optional(v.string()) },
  handler: async (ctx, { messageId, tool, detail }) => {
    const m = await ctx.db.get(messageId);
    if (m) await ctx.db.patch(messageId, { steps: [...m.steps, detail === undefined ? { tool } : { tool, detail }] });
    return null;
  },
});

export const finish = internalMutation({
  args: { messageId: v.id("aiMessages"), text: v.string(), status: v.union(v.literal("done"), v.literal("failed")), costUsd: v.number() },
  handler: async (ctx, { messageId, text, status, costUsd }) => {
    const m = await ctx.db.get(messageId);
    if (!m) return null;
    await ctx.db.patch(messageId, { text: cleanAnswer(text), status, costUsd: (m.costUsd ?? 0) + costUsd });
    return null;
  },
});

async function findRequest(ctx: QueryCtx, labId: Id<"companies">, sampleNo: string) {
  const rows = await ctx.db
    .query("labRequests")
    .withIndex("by_lab", (q) => q.eq("labId", labId))
    .order("desc")
    .take(500);
  return rows.find((r) => r.sampleNo?.toUpperCase() === sampleNo.trim().toUpperCase()) ?? null;
}

/**
 * Checks a proposal against the database and stores it as a card. Returns false (skipped) when it doesn't fit:
 * an id that isn't this workspace's or isn't open, the wrong account type, or results without a reading.
 */
export const addCard = internalMutation({
  args: { messageId: v.id("aiMessages"), name: v.string(), args: v.string(), reading: v.optional(readingValidator) },
  handler: async (ctx, { messageId, name, args, reading }): Promise<boolean> => {
    const msg = await ctx.db.get(messageId);
    const company = msg ? await ctx.db.get(msg.companyId) : null;
    const c = cleanCard(name, args);
    if (!msg || !company || !c) return false;
    let stored: StoredCard | null = null;
    if (c.type === "listing" && company.kind === "farm") {
      const photoIds: Id<"_storage">[] = [];
      if (c.usePhotos) {
        // The photos of this conversation's latest question that had photos, still the workspace's assistant photos.
        const earlier = await ctx.db
          .query("aiMessages")
          .withIndex("by_thread", (q) => q.eq("threadId", msg.threadId))
          .order("desc")
          .collect();
        const withPhotos = earlier.find((m) => m.role === "user" && m.photoIds.length > 0);
        for (const id of withPhotos?.photoIds ?? []) {
          const claim = await ctx.db
            .query("photoClaims")
            .withIndex("by_storage", (q) => q.eq("storageId", id))
            .first();
          if (claim?.companyId === company._id && claim.source === "assistant" && photoIds.length < 4) photoIds.push(id);
        }
      }
      const { usePhotos: _usePhotos, type: _type, ...rest } = c;
      stored = { type: "listing", ...rest, photoIds };
    } else if (c.type === "lab_request" && company.kind !== "lab") {
      const labId = c.labId ? ctx.db.normalizeId("companies", c.labId) : null;
      const lab = labId ? await ctx.db.get(labId) : null;
      const listingId = c.listingId ? ctx.db.normalizeId("listings", c.listingId) : null;
      const lot = listingId ? await ctx.db.get(listingId) : null;
      stored = {
        type: "lab_request",
        analyses: c.analyses,
        ...(lab && lab.kind === "lab" && labListed(lab, Date.now()) ? { labId: lab._id } : {}),
        ...(lot && lot.companyId === company._id ? { listingId: lot._id } : {}),
      };
    } else if (c.type === "offer" && company.kind === "factory") {
      const listingId = ctx.db.normalizeId("listings", c.listingId);
      const lot = listingId ? await ctx.db.get(listingId) : null;
      if (!lot || lot.status !== "open") return false;
      stored = {
        type: "offer",
        listingId: lot._id,
        ...(c.quantityKg !== undefined ? { quantityKg: Math.min(c.quantityKg, lot.remainingKg) } : {}),
        ...(c.priceDzdPerKg !== undefined ? { priceDzdPerKg: c.priceDzdPerKg } : {}),
      };
    } else if (c.type === "results" && company.kind === "lab" && reading) {
      const req = await findRequest(ctx, company._id, c.request);
      if (!req || req.status !== "received") return false;
      stored = { type: "results", requestId: req._id, sampleNo: req.sampleNo!, reading };
    }
    if (!stored) return false;
    await ctx.db.patch(messageId, { cards: [...msg.cards, stored] });
    return true;
  },
});

/** read_sheet, step 1: the request, the reader's switch and the lab's daily readings. Logs the reading. */
export const startSheet = internalMutation({
  args: { companyId: v.id("companies"), sampleNo: v.string() },
  handler: async (ctx, { companyId, sampleNo }) => {
    const req = await findRequest(ctx, companyId, sampleNo);
    if (!req) return { error: `No request ${sampleNo} in this lab.` };
    if (req.status !== "received") return { error: `${sampleNo} is not in the lab (status: ${req.status}). Results can only be filled for received samples.` };
    const cfg = await resolveConfig(ctx);
    if (!cfg.resultsReader) return { error: "The results reader is switched off." };
    const today = await ctx.db
      .query("aiReads")
      .withIndex("by_lab_created", (q) => q.eq("labId", companyId).gte("createdAt", dayStart(Date.now())))
      .take(LAB_DAILY_READS);
    if (today.length >= LAB_DAILY_READS) return { error: "The lab has used today's 30 readings." };
    const readId = await ctx.db.insert("aiReads", { labId: companyId, requestId: req._id, status: "pending", createdAt: Date.now() });
    return { readId, analyses: req.analyses.map((a) => a.analysis), receivedAt: req.receivedAt! };
  },
});

export const endSheet = internalMutation({
  args: { readId: v.id("aiReads"), ok: v.boolean(), costUsd: v.number() },
  handler: async (ctx, { readId, ok, costUsd }) => {
    await ctx.db.patch(readId, { status: ok ? "done" : "failed", costUsd, finishedAt: Date.now() });
    return null;
  },
});

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const argOf = (json: string, key: string): string => {
  try {
    const v = JSON.parse(json || "{}")?.[key];
    return typeof v === "string" ? v : "";
  } catch {
    return "";
  }
};

/** How many rows a read tool returned, for its step chip. */
function countOf(json: string): string | undefined {
  try {
    const v = JSON.parse(json);
    if (Array.isArray(v)) return String(v.length);
    for (const k of ["pending_offers", "sales"]) if (Array.isArray(v?.[k])) return String(v[k].length);
  } catch {
    // no count
  }
  return undefined;
}

type ChatMessage =
  | { role: "system" | "user"; content: string | object[] }
  | { role: "assistant"; content: string | null; tool_calls?: object[] }
  | { role: "tool"; tool_call_id: string; content: string };

export const run = internalAction({
  args: { messageId: v.id("aiMessages") },
  handler: async (ctx, { messageId }) => {
    const job = await ctx.runQuery(internal.assistant.load, { messageId });
    if (!job) return;
    if (!job.key) {
      await ctx.runMutation(internal.assistant.finish, { messageId, text: "", status: "failed", costUsd: 0 });
      return;
    }
    let text = "";
    let cost = 0;
    try {
      // Photos of the last two questions that had photos go inline (sniffed: images only).
      const images = new Map<string, string>();
      for (const m of job.history.filter((x) => x.role === "user" && x.photoIds.length).slice(-2)) {
        for (const id of m.photoIds) {
          const blob = await ctx.storage.get(id);
          if (!blob) continue;
          const data = await blob.arrayBuffer();
          const type = sniffType(new Uint8Array(data, 0, Math.min(16, data.byteLength)));
          if (type && type !== "application/pdf") images.set(id, `data:${type};base64,${toBase64(data)}`);
        }
      }
      const latest = job.history.filter((m) => m.role === "user").at(-1);
      const sheetPages = (latest?.photoIds ?? []).map((id) => images.get(id)).filter((u): u is string => !!u);

      const convo: ChatMessage[] = [
        {
          role: "system",
          content: systemPrompt({ kind: job.kind, workspace: job.workspace, firstName: job.firstName, today: new Date().toISOString().slice(0, 10) }),
        },
        ...job.history.map((m): ChatMessage => {
          if (m.role === "assistant") return { role: "assistant", content: m.text || "…" };
          const pics = m.photoIds.map((id) => images.get(id)).filter((u): u is string => !!u);
          if (pics.length === 0) return { role: "user", content: m.text || "(photos)" };
          return { role: "user", content: [{ type: "text", text: m.text || "(photos)" }, ...pics.map((url) => ({ type: "image_url", image_url: { url } }))] };
        }),
      ];
      const tools = toolsFor(job.kind);
      const readings = new Map<string, Reading>();

      for (let round = 0; round <= TOOL_ROUNDS; round++) {
        const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${job.key}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
          body: JSON.stringify({
            model: job.model,
            stream: true,
            max_tokens: 1500,
            temperature: 0.4,
            usage: { include: true },
            messages: convo,
            // The last round has no tools, so the model must answer.
            ...(round < TOOL_ROUNDS ? { tools } : {}),
          }),
        });
        if (!res.ok || !res.body) throw new Error(`OpenRouter ${res.status}`);
        const reader = new StreamReader();
        const decoder = new TextDecoder();
        const stream = res.body.getReader();
        let roundText = "";
        let lastWrite = Date.now();
        for (;;) {
          const { value, done } = await stream.read();
          if (done) break;
          for (const piece of reader.push(decoder.decode(value, { stream: true }))) roundText += piece;
          if (roundText && Date.now() - lastWrite > 300) {
            await ctx.runMutation(internal.assistant.write, { messageId, text: text + roundText });
            lastWrite = Date.now();
          }
        }
        cost += reader.costUsd;
        text += roundText;
        const calls = reader.toolCalls().filter((c) => c.name);
        if (calls.length === 0) break;
        if (roundText) text += "\n\n";

        convo.push({
          role: "assistant",
          content: roundText || null,
          tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments || "{}" } })),
        });
        for (const c of calls) {
          const args = c.arguments || "{}";
          let result: string;
          if (c.name.startsWith("propose_")) {
            const reqNo = c.name === "propose_results" ? argOf(args, "request_id").trim().toUpperCase() : "";
            const ok: boolean = await ctx.runMutation(internal.assistant.addCard, { messageId, name: c.name, args, reading: reqNo ? readings.get(reqNo) : undefined });
            await ctx.runMutation(internal.assistant.step, { messageId, tool: ok ? c.name : `${c.name}:skipped` });
            result = JSON.stringify(
              ok
                ? { shown: true, note: "A card is now shown under your answer. Tell the person what it opens; nothing is saved until they confirm." }
                : { shown: false, note: "That suggestion did not fit (unknown or closed id, wrong account, or read_sheet not done). Don't mention a card." },
            );
          } else if (c.name === "read_sheet" && job.kind === "lab") {
            const reqNo = argOf(args, "request_id");
            result = await readSheet(ctx, { companyId: job.companyId, key: job.key, model: job.model }, reqNo, sheetPages, readings, (n) => (cost += n));
            await ctx.runMutation(internal.assistant.step, { messageId, tool: "read_sheet", detail: reqNo || undefined });
          } else {
            result = await ctx.runQuery(internal.assistantTools.run, { companyId: job.companyId, name: c.name, args });
            await ctx.runMutation(internal.assistant.step, { messageId, tool: c.name, detail: countOf(result) });
          }
          convo.push({ role: "tool", tool_call_id: c.id, content: result });
        }
      }
      text = text.trim();
      await ctx.runMutation(internal.assistant.finish, { messageId, text, status: text ? "done" : "failed", costUsd: cost });
    } catch (e) {
      console.error("Assistant: run failed", e instanceof Error ? e.message.slice(0, 80) : "unknown");
      await ctx.runMutation(internal.assistant.finish, { messageId, text: "", status: "failed", costUsd: cost });
    }
  },
});

/** read_sheet: the results reader on the latest question's photos, for one of the lab's received requests. */
async function readSheet(
  ctx: ActionCtx,
  job: { companyId: Id<"companies">; key: string; model: string },
  sampleNo: string,
  pages: string[],
  readings: Map<string, Reading>,
  addCost: (n: number) => void,
): Promise<string> {
  if (!sampleNo) return JSON.stringify({ error: "Say which request (sample number, e.g. S-2026-0001)." });
  if (pages.length === 0) return JSON.stringify({ error: "Ask the person to send photos of the results sheet in their message." });
  const start = await ctx.runMutation(internal.assistant.startSheet, { companyId: job.companyId, sampleNo });
  if ("error" in start) return JSON.stringify({ error: start.error });
  let reading: Reading | null = null;
  let cost = 0;
  try {
    const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${job.key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      body: JSON.stringify({
        model: job.model,
        max_tokens: 2500,
        temperature: 0,
        response_format: readSchema(start.analyses),
        usage: { include: true },
        messages: [
          { role: "system", content: readingPrompt(start.analyses) },
          { role: "user", content: [{ type: "text", text: "Here is the lab's results sheet." }, ...pages.map((url) => ({ type: "image_url", image_url: { url } }))] },
        ],
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { cost?: number } };
      cost = typeof json.usage?.cost === "number" ? json.usage.cost : 0;
      reading = parseReading(json.choices?.[0]?.message?.content ?? "", start.analyses, start.receivedAt, Date.now());
    }
  } catch {
    // reported below
  }
  addCost(cost);
  await ctx.runMutation(internal.assistant.endSheet, { readId: start.readId, ok: !!reading, costUsd: cost });
  if (!reading) return JSON.stringify({ error: "The sheet could not be read. Ask for a clearer photo." });
  readings.set(sampleNo.trim().toUpperCase(), reading);
  return JSON.stringify({ request: sampleNo, values: reading, next: "Call propose_results with this request_id so the analyst can check and save." });
}

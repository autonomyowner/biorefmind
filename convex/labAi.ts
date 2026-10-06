import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation } from "./_generated/server";
import { resolveConfig } from "./ai";
import { getRequest, requireLab } from "./labwork";
import { OPENROUTER_URL, utcDay } from "./lib/ai";
import {
  cleanUploads,
  LAB_DAILY_READS,
  MAX_PAGES,
  parseReading,
  READ_REFUSE,
  READ_TIMEOUT_MS,
  readingPrompt,
  readSchema,
  sniffType,
  type Reading,
} from "./lib/aiRead";
import { LAB_REFUSE } from "./lib/labwork";
import { MARKET_REFUSE } from "./lib/market";

// The lab results reader: photos or a PDF of the lab's own sheet → suggested values for the results form.
// Nothing is saved: the analyst checks every value, then saves a draft or releases as usual.
// Design and contract: docs/superpowers/specs/2026-10-06-ai-results-reader-design.md

const ATTEMPTS = 2;

/** Where the lab uploads its pages (analysts and above, while the request is open). */
export const uploadUrl = mutation({
  args: { requestId: v.id("labRequests") },
  handler: async (ctx, { requestId }) => {
    const req = await getRequest(ctx, requestId);
    await requireLab(ctx, req.labId, "inspector");
    if (req.status !== "received") throw new ConvexError(LAB_REFUSE.closed);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Checks everything, claims the uploaded pages for the lab and logs the reading. Returns what the action needs. */
export const start = internalMutation({
  args: { requestId: v.id("labRequests"), files: v.array(v.id("_storage")) },
  handler: async (ctx, { requestId, files }) => {
    const req = await getRequest(ctx, requestId);
    const { company } = await requireLab(ctx, req.labId, "inspector");
    if (req.status !== "received") throw new ConvexError(LAB_REFUSE.closed);
    const cfg = await resolveConfig(ctx);
    if (!cfg.resultsReader || !cfg.key) throw new ConvexError(READ_REFUSE.off);
    const now = Date.now();
    const today = await ctx.db
      .query("aiReads")
      .withIndex("by_lab_created", (q) => q.eq("labId", company._id).gte("createdAt", utcDay(now) * 86_400_000))
      .take(LAB_DAILY_READS);
    if (today.length >= LAB_DAILY_READS) throw new ConvexError(READ_REFUSE.limit);

    const ids = [...new Set(files)];
    if (ids.length === 0 || ids.length > MAX_PAGES) throw new ConvexError(READ_REFUSE.files);
    const metas = [];
    for (const id of ids) {
      // Only a fresh upload: never a photo some company already owns (a lot photo), so it can't be read or deleted.
      const meta = await ctx.db.system.get(id);
      const claimed = await ctx.db
        .query("photoClaims")
        .withIndex("by_storage", (q) => q.eq("storageId", id))
        .first();
      if (!meta || claimed) throw new ConvexError(MARKET_REFUSE.photoMissing);
      metas.push({ storageId: id, size: meta.size });
    }
    for (const m of metas) await ctx.db.insert("photoClaims", { storageId: m.storageId, companyId: company._id });
    const readId = await ctx.db.insert("aiReads", { labId: company._id, requestId, status: "pending", createdAt: now });
    return {
      readId,
      key: cfg.key,
      model: cfg.model,
      analyses: req.analyses.map((a) => a.analysis),
      receivedAt: req.receivedAt!,
      files: metas.map((m) => m.storageId),
    };
  },
});

/** Logs the outcome and deletes the pages: BiorefMind keeps no copy of the lab's sheet. */
export const finish = internalMutation({
  args: {
    readId: v.id("aiReads"),
    status: v.union(v.literal("done"), v.literal("failed"), v.literal("refused")),
    costUsd: v.number(),
    files: v.array(v.id("_storage")),
  },
  handler: async (ctx, { readId, status, costUsd, files }) => {
    const read = await ctx.db.get(readId);
    if (!read) return null;
    // Refused files never reached the model: they don't count against the lab's day.
    if (status === "refused") await ctx.db.delete(readId);
    else await ctx.db.patch(readId, { status, costUsd, finishedAt: Date.now() });
    for (const id of files) {
      const claims = await ctx.db
        .query("photoClaims")
        .withIndex("by_storage", (q) => q.eq("storageId", id))
        .collect();
      // Delete only what this lab claimed in `start`.
      if (claims.length === 1 && claims[0].companyId === read.labId) {
        await ctx.db.delete(claims[0]._id);
        await ctx.storage.delete(id);
      }
    }
    return null;
  },
});

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Reads the lab's pages and returns suggested values. Throws a plain refusal when it can't. */
export const readResults = action({
  args: { requestId: v.id("labRequests"), files: v.array(v.id("_storage")) },
  handler: async (ctx, { requestId, files }): Promise<Reading> => {
    const job = await ctx.runMutation(internal.labAi.start, { requestId, files });
    let cost = 0;
    let reading: Reading | null = null;
    let refused = false;
    try {
      const pages: { type: string; size: number; data: ArrayBuffer }[] = [];
      for (const id of job.files) {
        const blob = await ctx.storage.get(id);
        if (!blob) throw new ConvexError(MARKET_REFUSE.photoMissing);
        const data = await blob.arrayBuffer();
        pages.push({ type: sniffType(new Uint8Array(data, 0, Math.min(16, data.byteLength))) ?? "", size: data.byteLength, data });
      }
      try {
        cleanUploads(pages.map((p) => ({ contentType: p.type, size: p.size })));
      } catch (e) {
        refused = true;
        throw e;
      }
      const parts: object[] = [{ type: "text", text: "Here is the lab's results sheet." }];
      for (const p of pages) {
        const url = `data:${p.type};base64,${toBase64(p.data)}`;
        parts.push(
          p.type === "application/pdf"
            ? { type: "file", file: { filename: "results.pdf", file_data: url } }
            : { type: "image_url", image_url: { url } },
        );
      }
      for (let attempt = 1; attempt <= ATTEMPTS && !reading; attempt++) {
        try {
          const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${job.key}`, "Content-Type": "application/json" },
            signal: AbortSignal.timeout(READ_TIMEOUT_MS),
            body: JSON.stringify({
              model: job.model,
              max_tokens: 2500,
              temperature: 0,
              response_format: readSchema(job.analyses),
              usage: { include: true },
              messages: [
                { role: "system", content: readingPrompt(job.analyses) },
                { role: "user", content: parts },
              ],
            }),
          });
          if (!res.ok) {
            console.error("Results reader: OpenRouter error", res.status);
            continue;
          }
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { cost?: number } };
          if (typeof json.usage?.cost === "number") cost += json.usage.cost;
          reading = parseReading(json.choices?.[0]?.message?.content ?? "", job.analyses, job.receivedAt, Date.now());
          if (!reading) console.error("Results reader: answer did not fit the shape");
        } catch (e) {
          console.error("Results reader: call failed", e instanceof Error ? e.name : "unknown");
        }
      }
    } finally {
      await ctx.runMutation(internal.labAi.finish, {
        readId: job.readId,
        status: refused ? "refused" : reading ? "done" : "failed",
        costUsd: cost,
        files: job.files,
      });
    }
    if (!reading) throw new ConvexError(READ_REFUSE.failed);
    return reading;
  },
});

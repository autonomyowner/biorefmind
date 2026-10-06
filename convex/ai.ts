import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin } from "./admin";
import { cleanKey, cleanModel, DEFAULT_MODEL, maskKey, OPENROUTER_URL } from "./lib/ai";

// Admin AI settings. Design and contract: docs/superpowers/specs/2026-10-06-ai-photo-check-design.md
// The key is read only by internal functions; no public function ever returns it.

async function settingsRow(ctx: QueryCtx | MutationCtx) {
  return await ctx.db.query("aiSettings").first();
}

/** The key and model every AI call uses: the admin's saved key first, then the server setting. */
export async function resolveConfig(ctx: QueryCtx) {
  const row = await settingsRow(ctx);
  const envKey = process.env.OPENROUTER_API_KEY || undefined;
  const key = row?.openrouterKey ?? envKey;
  return {
    key,
    keySource: (row?.openrouterKey ? "saved" : envKey ? "env" : "none") as "saved" | "env" | "none",
    model: row?.model ?? (process.env.AI_MODEL || DEFAULT_MODEL),
    photoCheck: row?.photoCheck ?? true,
    resultsReader: row?.resultsReader ?? true,
  };
}

/** For actions only (assistant, photo check). */
export const config = internalQuery({
  args: {},
  handler: async (ctx) => {
    const c = await resolveConfig(ctx);
    return { key: c.key, model: c.model, photoCheck: c.photoCheck };
  },
});

/** The admin's view: masked key, model, switches, and this month's photo checks, readings and spend. */
export const settings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const c = await resolveConfig(ctx);
    const now = new Date();
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    // By when each check finished, so a retry this month counts this month.
    const checks = await ctx.db
      .query("photoChecks")
      .withIndex("by_finished", (q) => q.gte("finishedAt", monthStart))
      .collect();
    let done = 0;
    let failed = 0;
    let costUsd = 0;
    for (const p of checks) {
      if (p.status === "done") done++;
      if (p.status === "failed") failed++;
      costUsd += p.costUsd ?? 0;
    }
    const reads = await ctx.db
      .query("aiReads")
      .withIndex("by_finished", (q) => q.gte("finishedAt", monthStart))
      .collect();
    for (const r of reads) costUsd += r.costUsd ?? 0;
    return {
      keySource: c.keySource,
      keyMasked: maskKey(c.key),
      model: c.model,
      photoCheck: c.photoCheck,
      resultsReader: c.resultsReader,
      month: { done, failed, reads: reads.filter((r) => r.status === "done").length, costUsd: Math.round(costUsd * 10_000) / 10_000 },
    };
  },
});

async function upsert(
  ctx: MutationCtx,
  userId: Id<"users">,
  patch: { openrouterKey?: string | undefined; model?: string; photoCheck?: boolean; resultsReader?: boolean },
) {
  const row = await settingsRow(ctx);
  const stamp = { updatedAt: Date.now(), updatedBy: userId };
  if (row) await ctx.db.patch(row._id, { ...patch, ...stamp });
  else await ctx.db.insert("aiSettings", { photoCheck: true, ...patch, ...stamp });
}

export const saveKey = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const user = await requireAdmin(ctx);
    await upsert(ctx, user._id, { openrouterKey: cleanKey(key) });
    return null;
  },
});

/** Forgets the saved key; the server setting (if any) takes over. */
export const removeKey = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    await upsert(ctx, user._id, { openrouterKey: undefined });
    return null;
  },
});

export const update = mutation({
  args: { model: v.optional(v.string()), photoCheck: v.optional(v.boolean()), resultsReader: v.optional(v.boolean()) },
  handler: async (ctx, { model, photoCheck, resultsReader }) => {
    const user = await requireAdmin(ctx);
    await upsert(ctx, user._id, {
      ...(model !== undefined ? { model: cleanModel(model) } : {}),
      ...(photoCheck !== undefined ? { photoCheck } : {}),
      ...(resultsReader !== undefined ? { resultsReader } : {}),
    });
    return null;
  },
});

/** Admin-only copy of `config`, for testKey (actions keep the caller's identity). */
export const adminKey = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await resolveConfig(ctx)).key ?? null;
  },
});

type TestResult = { ok: true; usageUsd: number; limitUsd: number | null } | { ok: false; error: string };

/** Asks OpenRouter about the key (free): spend so far and the limit, or the problem in plain words. */
export const testKey = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    const key: string | null = await ctx.runQuery(internal.ai.adminKey, {});
    if (!key) return { ok: false, error: "No key saved." };
    try {
      const res = await fetch(`${OPENROUTER_URL}/key`, { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) return { ok: false, error: `OpenRouter refused the key (${res.status}).` };
      const json = (await res.json()) as { data?: { usage?: number; limit?: number | null } };
      return { ok: true, usageUsd: json.data?.usage ?? 0, limitUsd: json.data?.limit ?? null };
    } catch {
      return { ok: false, error: "Could not reach OpenRouter. Please try again." };
    }
  },
});

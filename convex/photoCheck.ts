import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireMember } from "./lib/access";
import {
  AI_REFUSE,
  DAILY_CAP,
  OPENROUTER_URL,
  parsePhotoCheck,
  PHOTO_SCHEMA,
  photoCheckPrompt,
  RETRIES_PER_DAY,
  utcDay,
  type PhotoCheckResult,
} from "./lib/ai";
import { MARKET_REFUSE } from "./lib/market";

// The AI's look at a lot's photos. Design and contract: docs/superpowers/specs/2026-10-06-ai-photo-check-design.md

const ATTEMPTS = 2;

export async function checkFor(ctx: QueryCtx, listingId: Id<"listings">): Promise<Doc<"photoChecks"> | null> {
  return await ctx.db
    .query("photoChecks")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .first();
}

/** Queues a check for a lot that has photos (called by market.createListing). */
export async function queuePhotoCheck(ctx: MutationCtx, listingId: Id<"listings">) {
  const checkId = await ctx.db.insert("photoChecks", { listingId, status: "pending", attempts: 0, createdAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.photoCheck.run, { checkId });
}

/** The farmer's view: status always, result when done. */
export function farmerView(p: Doc<"photoChecks"> | null) {
  if (!p) return undefined;
  return p.status === "done" && p.result ? { status: p.status, result: p.result } : { status: p.status };
}

/** Everyone else's view: the result only once done. */
export function publicView(p: Doc<"photoChecks"> | null): PhotoCheckResult | undefined {
  return p?.status === "done" ? p.result : undefined;
}

export const load = internalQuery({
  args: { checkId: v.id("photoChecks") },
  handler: async (ctx, { checkId }) => {
    const check = await ctx.db.get(checkId);
    const listing = check ? await ctx.db.get(check.listingId) : null;
    if (!check || !listing || check.status !== "pending") return null;
    const today = utcDay(Date.now()) * 86_400_000;
    const ranToday = await ctx.db
      .query("photoChecks")
      .withIndex("by_created", (q) => q.gte("createdAt", today))
      .take(DAILY_CAP + 1);
    const urls = await Promise.all(listing.photoIds.map((id) => ctx.storage.getUrl(id)));
    return {
      overCap: ranToday.filter((p) => p.status !== "off" && p._id !== checkId).length >= DAILY_CAP,
      residue: listing.residue,
      residueName: listing.residueName,
      photoUrls: urls.filter((u): u is string => u !== null),
    };
  },
});

export const save = internalMutation({
  args: {
    checkId: v.id("photoChecks"),
    status: v.union(v.literal("done"), v.literal("failed"), v.literal("off")),
    result: v.optional(v.any()),
    model: v.optional(v.string()),
    costUsd: v.optional(v.number()),
    attempts: v.number(),
  },
  handler: async (ctx, { checkId, status, result, model, costUsd, attempts }) => {
    const check = await ctx.db.get(checkId);
    if (!check) return null;
    await ctx.db.patch(checkId, {
      status,
      result: status === "done" ? (result as PhotoCheckResult) : undefined,
      model,
      costUsd: (check.costUsd ?? 0) + (costUsd ?? 0),
      attempts: check.attempts + attempts,
      finishedAt: Date.now(),
    });
    return null;
  },
});

/** One OpenRouter call: the parsed answer and its cost, or null. */
async function ask(key: string, model: string, prompt: string, photoUrls: string[]) {
  const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.2,
      response_format: PHOTO_SCHEMA,
      usage: { include: true },
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Here are the lot's photos." },
            ...photoUrls.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error("Photo check: OpenRouter error", res.status);
    return { result: null, cost: 0 };
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { cost?: number } };
  const text = json.choices?.[0]?.message?.content ?? "";
  const result = parsePhotoCheck(text);
  if (!result) console.error("Photo check: answer did not fit the shape");
  return { result, cost: typeof json.usage?.cost === "number" ? json.usage.cost : 0 };
}

export const run = internalAction({
  args: { checkId: v.id("photoChecks") },
  handler: async (ctx, { checkId }) => {
    const lot = await ctx.runQuery(internal.photoCheck.load, { checkId });
    if (!lot) return;
    const cfg = await ctx.runQuery(internal.ai.config, {});
    if (!cfg.photoCheck || !cfg.key || lot.overCap || lot.photoUrls.length === 0) {
      await ctx.runMutation(internal.photoCheck.save, { checkId, status: "off", attempts: 0 });
      return;
    }
    const prompt = photoCheckPrompt(lot.residue, lot.residueName);
    let cost = 0;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const out = await ask(cfg.key, cfg.model, prompt, lot.photoUrls);
        cost += out.cost;
        if (out.result) {
          await ctx.runMutation(internal.photoCheck.save, {
            checkId,
            status: "done",
            result: out.result,
            model: cfg.model,
            costUsd: cost,
            attempts: attempt,
          });
          return;
        }
      } catch (e) {
        console.error("Photo check: call failed", e instanceof Error ? e.message : "unknown");
      }
    }
    await ctx.runMutation(internal.photoCheck.save, { checkId, status: "failed", model: cfg.model, costUsd: cost, attempts: ATTEMPTS });
  },
});

/** The farmer presses "Try again" on a failed check (3 times a UTC day per lot). */
export const retry = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    const { company } = await requireMember(ctx, listing.companyId, "manager", MARKET_REFUSE.role);
    if (company.kind !== "farm") throw new ConvexError(MARKET_REFUSE.farmOnly);
    const check = await checkFor(ctx, listingId);
    if (!check || check.status !== "failed") throw new ConvexError(AI_REFUSE.notFailed);
    const today = utcDay(Date.now());
    const used = check.retryDay === today ? (check.retries ?? 0) : 0;
    if (used >= RETRIES_PER_DAY) throw new ConvexError(AI_REFUSE.retries);
    await ctx.db.patch(check._id, { status: "pending", retryDay: today, retries: used + 1 });
    await ctx.scheduler.runAfter(0, internal.photoCheck.run, { checkId: check._id });
    return null;
  },
});

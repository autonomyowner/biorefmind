import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireMember } from "./lib/access";
import {
  AI_REFUSE,
  CALL_TIMEOUT_MS,
  DAILY_CAP,
  FARM_DAILY_CAP,
  OPENROUTER_URL,
  parsePhotoCheck,
  PHOTO_SCHEMA,
  photoCheckData,
  photoCheckPrompt,
  photoCheckResultValidator,
  RETRIES_PER_DAY,
  STUCK_AFTER_MS,
  utcDay,
  type PhotoCheckResult,
} from "./lib/ai";
import { MARKET_REFUSE } from "./lib/market";

// The AI's look at a lot's photos. Design and contract: docs/superpowers/specs/2026-10-06-ai-photo-check-design.md

const ATTEMPTS = 2;

const dayStart = (now: number) => utcDay(now) * 86_400_000;

export async function checkFor(ctx: QueryCtx, listingId: Id<"listings">): Promise<Doc<"photoChecks"> | null> {
  return await ctx.db
    .query("photoChecks")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .first();
}

/** Pending, or pending so long that the run must have died (shown and retried as failed). */
function effectiveStatus(p: Doc<"photoChecks">, now: number): Doc<"photoChecks">["status"] {
  if (p.status === "pending" && now - (p.queuedAt ?? p.createdAt) > STUCK_AFTER_MS) return "failed";
  return p.status;
}

/**
 * Queues a check for a lot that has photos (called by market.createListing).
 * A farm over its daily allowance gets an "off" check straight away, with no call.
 */
export async function queuePhotoCheck(ctx: MutationCtx, listingId: Id<"listings">, companyId: Id<"companies">) {
  const now = Date.now();
  const farmToday = await ctx.db
    .query("photoChecks")
    .withIndex("by_company_created", (q) => q.eq("companyId", companyId).gte("createdAt", dayStart(now)))
    .filter((q) => q.neq(q.field("status"), "off"))
    .take(FARM_DAILY_CAP);
  if (farmToday.length >= FARM_DAILY_CAP) {
    await ctx.db.insert("photoChecks", { listingId, companyId, status: "off", attempts: 0, createdAt: now, finishedAt: now });
    return;
  }
  const checkId = await ctx.db.insert("photoChecks", { listingId, companyId, status: "pending", attempts: 0, createdAt: now, queuedAt: now });
  await ctx.scheduler.runAfter(0, internal.photoCheck.run, { checkId });
}

/** The farmer's view: status always, result when done. */
export function farmerView(p: Doc<"photoChecks"> | null, now: number) {
  if (!p) return undefined;
  const status = effectiveStatus(p, now);
  return status === "done" && p.result ? { status, result: p.result } : { status };
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
    // Checks that were off cost nothing, so only the others count towards the platform's cap.
    const ranToday = await ctx.db
      .query("photoChecks")
      .withIndex("by_created", (q) => q.gte("createdAt", dayStart(Date.now())))
      .filter((q) => q.and(q.neq(q.field("status"), "off"), q.neq(q.field("_id"), checkId)))
      .take(DAILY_CAP);
    const urls = await Promise.all(listing.photoIds.map((id) => ctx.storage.getUrl(id)));
    return {
      overCap: ranToday.length >= DAILY_CAP,
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
    result: v.optional(photoCheckResultValidator),
    model: v.optional(v.string()),
    costUsd: v.optional(v.number()),
    attempts: v.number(),
  },
  handler: async (ctx, { checkId, status, result, model, costUsd, attempts }) => {
    const check = await ctx.db.get(checkId);
    if (!check) return null;
    await ctx.db.patch(checkId, {
      status,
      result: status === "done" ? result : undefined,
      model,
      costUsd: (check.costUsd ?? 0) + (costUsd ?? 0),
      attempts: check.attempts + attempts,
      finishedAt: Date.now(),
    });
    return null;
  },
});

/** One OpenRouter call: the parsed answer and its cost, or null. */
async function ask(key: string, model: string, residue: string, residueName: string | undefined, photoUrls: string[]) {
  const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.2,
      response_format: PHOTO_SCHEMA,
      usage: { include: true },
      messages: [
        { role: "system", content: photoCheckPrompt(residue) },
        {
          role: "user",
          content: [
            { type: "text", text: `${photoCheckData(residue, residueName)}\nHere are the lot's photos.` },
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
    let cost = 0;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const out = await ask(cfg.key, cfg.model, lot.residue, lot.residueName, lot.photoUrls);
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
        console.error("Photo check: call failed", e instanceof Error ? e.name : "unknown");
      }
    }
    await ctx.runMutation(internal.photoCheck.save, { checkId, status: "failed", model: cfg.model, costUsd: cost, attempts: ATTEMPTS });
  },
});

/** The farmer presses "Try again" on a failed (or stuck) check of an open lot: 3 times a UTC day per lot. */
export const retry = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new ConvexError(MARKET_REFUSE.noListing);
    const { company } = await requireMember(ctx, listing.companyId, "manager", MARKET_REFUSE.role);
    if (company.kind !== "farm") throw new ConvexError(MARKET_REFUSE.farmOnly);
    if (listing.status !== "open") throw new ConvexError(MARKET_REFUSE.closed);
    const now = Date.now();
    const check = await checkFor(ctx, listingId);
    if (!check || effectiveStatus(check, now) !== "failed") throw new ConvexError(AI_REFUSE.notFailed);
    const today = utcDay(now);
    const used = check.retryDay === today ? (check.retries ?? 0) : 0;
    if (used >= RETRIES_PER_DAY) throw new ConvexError(AI_REFUSE.retries);
    await ctx.db.patch(check._id, { status: "pending", queuedAt: now, retryDay: today, retries: used + 1 });
    await ctx.scheduler.runAfter(0, internal.photoCheck.run, { checkId: check._id });
    return null;
  },
});

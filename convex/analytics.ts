import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireMember } from "./lib/access";
import { toRow } from "./lib/shipmentView";

const DAY = 24 * 60 * 60 * 1000;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * The contract's Overview for one company. Callers check access first.
 * Averages: score to 1 decimal; confidence, overrideRate and shareA to 2.
 * `trend` is the last 30 UTC days, oldest first, today included.
 */
export async function computeOverview(ctx: QueryCtx, companyId: Id<"companies">, now = Date.now()) {
  const all = await ctx.db
    .query("shipments")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .order("desc")
    .collect();

  const byRoute = { A: 0, B: 0, C: 0 };
  for (const s of all) byRoute[s.route]++;

  const today = Math.floor(now / DAY) * DAY;
  const firstDay = today - 29 * DAY;
  const days = new Map<string, number[]>();
  for (let d = firstDay; d <= today; d += DAY) days.set(new Date(d).toISOString().slice(0, 10), []);
  for (const s of all) {
    const key = new Date(s.receivedAt).toISOString().slice(0, 10);
    days.get(key)?.push(s.score);
  }
  const trend = [...days.entries()].map(([day, scores]) => ({ day, count: scores.length, avgScore: r1(avg(scores)) }));

  const bySupplier = new Map<string, { count: number; scores: number[]; a: number }>();
  for (const s of all) {
    const e = bySupplier.get(s.supplier) ?? { count: 0, scores: [], a: 0 };
    e.count++;
    e.scores.push(s.score);
    if (s.route === "A") e.a++;
    bySupplier.set(s.supplier, e);
  }
  const suppliers = [...bySupplier.entries()]
    .map(([supplier, e]) => ({ supplier, count: e.count, avgScore: r1(avg(e.scores)), shareA: r2(e.a / e.count) }))
    .sort((x, y) => y.count - x.count || x.supplier.localeCompare(y.supplier))
    .slice(0, 10);

  const recent = [];
  for (const s of all.slice(0, 5)) recent.push(await toRow(ctx, s));

  return {
    total: all.length,
    last30: all.filter((s) => s.receivedAt >= now - 30 * DAY).length,
    byRoute,
    avgScore: r1(avg(all.map((s) => s.score))),
    avgConfidence: r2(avg(all.map((s) => s.confidence))),
    overrideRate: all.length ? r2(all.filter((s) => s.overridden).length / all.length) : 0,
    trend,
    suppliers,
    recent,
  };
}

export const overview = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireMember(ctx, companyId);
    return await computeOverview(ctx, companyId);
  },
});

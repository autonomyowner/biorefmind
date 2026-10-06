import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { computeOverview } from "./analytics";
import { requireMember } from "./lib/access";
import { getCrop } from "./lib/crops";

const QUESTION_REFUSAL = "Please type a question.";

export const messages = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const { user } = await requireMember(ctx, companyId);
    const rows = await ctx.db
      .query("assistantMessages")
      .withIndex("by_company_user", (q) => q.eq("companyId", companyId).eq("userId", user._id))
      .order("desc")
      .take(50);
    return rows.reverse().map((m) => ({ _id: m._id, role: m.role, content: m.content, createdAt: m.createdAt }));
  },
});

export const clear = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const { user } = await requireMember(ctx, companyId);
    const rows = await ctx.db
      .query("assistantMessages")
      .withIndex("by_company_user", (q) => q.eq("companyId", companyId).eq("userId", user._id))
      .collect();
    for (const m of rows) await ctx.db.delete(m._id);
    return null;
  },
});

/** Access check plus everything the model is told about this workspace. */
export const context = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const { user, company } = await requireMember(ctx, companyId);
    const { recent: _recent, trend: _trend, ...overview } = await computeOverview(ctx, companyId);
    const latest = await ctx.db
      .query("shipments")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .order("desc")
      .take(20);
    const history = await ctx.db
      .query("assistantMessages")
      .withIndex("by_company_user", (q) => q.eq("companyId", companyId).eq("userId", user._id))
      .order("desc")
      .take(10);
    return {
      userId: user._id,
      companyName: company.name,
      overview,
      shipments: latest.map((s) => ({
        code: s.code,
        supplier: s.supplier,
        receivedAt: new Date(s.receivedAt).toISOString().slice(0, 10),
        weightKg: s.weightKg,
        lab: s.lab,
        score: s.score,
        confidence: s.confidence,
        route: s.route,
        autoRoute: s.autoRoute,
      })),
      history: history.reverse().map((m) => ({ role: m.role, content: m.content })),
    };
  },
});

export const store = internalMutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("assistantMessages", { ...args, createdAt: Date.now() });
  },
});

type Context = {
  companyName: string;
  overview: {
    total: number;
    last30: number;
    byRoute: { A: number; B: number; C: number };
    avgScore: number;
    avgConfidence: number;
    overrideRate: number;
    suppliers: { supplier: string; count: number; avgScore: number; shareA: number }[];
  };
  shipments: unknown[];
};

const pct = (n: number) => `${Math.round(n * 100)} %`;

function rulesText(): string {
  const t = getCrop("pomegranate_peel")!.thresholds;
  return [
    `Routing rules for pomegranate peel (placeholder thresholds, to calibrate with lab data):`,
    `- Hard gates: mold above ${t.gates.find((g) => g.field === "mold")!.max} % or moisture above ${t.gates.find((g) => g.field === "moisture")!.max} % → route C.`,
    `- Score 0–100 from punicalagin (40 %), mold (25 %), moisture (20 %) and oxidation (15 %); missing values are skipped.`,
    `- Route A (pharmaceutical): score ≥ ${t.routeA.minScore}, punicalagin ≥ ${t.routeA.min.punicalagin} % and mold ≤ ${t.routeA.max.mold} %.`,
    `- Route B (food-grade pectin, oils, bio-packaging): score ≥ ${t.routeB.minScore}. Otherwise route C (paper, fermentation, feed).`,
  ].join("\n");
}

/** The built-in responder used without an API key or when the model call fails. */
export function fallbackAnswer(question: string, c: Context): string {
  const o = c.overview;
  const q = question.toLowerCase();
  if (o.total === 0 && !/rule|route|threshold|score/.test(q)) {
    return `${c.companyName} has no shipments recorded yet. Add a shipment with its lab values and I will summarise quality and routing here.\n\n${rulesText()}`;
  }
  const summary =
    `${c.companyName} has ${o.total} shipments (${o.last30} in the last 30 days): ` +
    `${o.byRoute.A} on route A, ${o.byRoute.B} on route B and ${o.byRoute.C} on route C. ` +
    `Average score ${o.avgScore}, average confidence ${pct(o.avgConfidence)}, ` +
    `${pct(o.overrideRate)} of routes changed by an inspector.`;
  const parts = [summary];
  if (/supplier|vendor|source/.test(q) && o.suppliers.length > 0) {
    const best = [...o.suppliers].sort((a, b) => b.avgScore - a.avgScore);
    parts.push(
      "Suppliers by average score:\n" +
        best.map((s) => `- ${s.supplier}: ${s.count} shipments, average ${s.avgScore}, ${pct(s.shareA)} on route A`).join("\n"),
    );
  }
  if (/rule|route|threshold|score|why|how/.test(q) || parts.length === 1) parts.push(rulesText());
  parts.push("(Automatic summary — connect an AI model for free-form answers.)");
  return parts.join("\n\n");
}

const SYSTEM_PROMPT = `You are the BiorefMind assistant, helping a factory or lab team manage agricultural biomass shipments (pomegranate peels first).
Each shipment gets a 0–100 quality score and a route: A pharmaceutical extraction, B food-grade pectin / oils / bio-packaging, C paper / fermentation / feed. Inspectors can override a route with a logged reason.
Answer briefly and concretely in plain English, using only the data provided. If the data does not answer the question, say so. Never invent shipments or numbers. Thresholds are placeholders to be calibrated with lab data.`;

export const ask = action({
  args: { companyId: v.id("companies"), question: v.string() },
  handler: async (ctx, { companyId, question }): Promise<{ answer: string }> => {
    const q = question.trim();
    if (q.length < 1 || q.length > 2000) throw new ConvexError(QUESTION_REFUSAL);
    const c = await ctx.runQuery(internal.assistant.context, { companyId });
    await ctx.runMutation(internal.assistant.store, { companyId, userId: c.userId, role: "user", content: q });

    let answer: string | null = null;
    const { key, model } = await ctx.runQuery(internal.ai.config, {});
    if (key) {
      try {
        const data = `Workspace: ${c.companyName}\n\n${rulesText()}\n\nOverview: ${JSON.stringify(c.overview)}\n\nLatest shipments: ${JSON.stringify(c.shipments)}`;
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            messages: [
              { role: "system", content: `${SYSTEM_PROMPT}\n\n${data}` },
              ...c.history,
              { role: "user", content: q },
            ],
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const text = json.choices?.[0]?.message?.content?.trim();
          if (text) answer = text;
        } else {
          console.error("OpenRouter error", res.status);
        }
      } catch (e) {
        console.error("OpenRouter call failed", e);
      }
    }
    answer ??= fallbackAnswer(q, c);
    await ctx.runMutation(internal.assistant.store, { companyId, userId: c.userId, role: "assistant", content: answer });
    return { answer };
  },
});

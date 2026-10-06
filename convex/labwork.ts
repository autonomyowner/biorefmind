import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { labResultsDoc } from "./schema";
import { requireMember } from "./lib/access";
import { labListed } from "./lib/accounts";
import {
  cleanDueAt,
  cleanReason,
  cleanResults,
  cleanSample,
  effectiveStatus,
  isOverdue,
  LAB_REFUSE,
  lotScore,
  optionalText,
  sampleNo,
  verifyCode,
  type Results,
} from "./lib/labwork";

// Design and contract: docs/superpowers/specs/2026-10-06-lab-requests-design.md

const sampleArg = v.object({
  residue: v.string(),
  residueName: v.optional(v.string()),
  label: v.string(),
  state: v.string(),
  collectedAt: v.number(),
  region: v.string(),
  grams: v.number(),
  packaging: v.optional(v.string()),
  notes: v.optional(v.string()),
});

async function getRequest(ctx: QueryCtx | MutationCtx, requestId: Id<"labRequests">) {
  const req = await ctx.db.get(requestId);
  if (!req) throw new ConvexError(LAB_REFUSE.noRequest);
  return req;
}

/** The request's status as people see it (timeouts and lapsed labs worked out now). */
async function statusOf(ctx: QueryCtx | MutationCtx, req: Doc<"labRequests">, now: number) {
  const lab = await ctx.db.get(req.labId);
  return effectiveStatus(req, now, lab !== null && labListed(lab, now));
}

/** A member of the request's client (owner or manager) — the farm or factory that asked. */
async function requireClient(ctx: MutationCtx, req: Doc<"labRequests">) {
  return await requireMember(ctx, req.clientId, "manager", LAB_REFUSE.role);
}

/** A member of the request's lab with at least `minRole`. */
async function requireLab(ctx: QueryCtx | MutationCtx, labId: Id<"companies">, minRole: "manager" | "inspector") {
  const m = await requireMember(ctx, labId, minRole, LAB_REFUSE.role);
  if (m.company.kind !== "lab") throw new ConvexError(LAB_REFUSE.notLab);
  return m;
}

/** Released versions of a request, newest first. */
async function reportsOf(ctx: QueryCtx, requestId: Id<"labRequests">) {
  const rows = await ctx.db
    .query("labReports")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .order("desc")
    .collect();
  return rows.map((r) => ({
    code: r.code,
    version: r.version,
    reportNo: r.reportNo,
    releasedAt: r.releasedAt,
    amendReason: r.amendReason,
  }));
}

export const request = mutation({
  args: {
    clientId: v.id("companies"),
    labId: v.id("companies"),
    analyses: v.array(v.string()),
    listingId: v.optional(v.id("listings")),
    saleId: v.optional(v.id("sales")),
    sample: sampleArg,
    delivery: v.union(v.literal("dropoff"), v.literal("courier")),
    tracking: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, company: client } = await requireMember(ctx, args.clientId, "manager", LAB_REFUSE.role);
    if (client.kind !== "farm" && client.kind !== "factory") throw new ConvexError(LAB_REFUSE.clientKind);
    const now = Date.now();
    const lab = await ctx.db.get(args.labId);
    if (!lab || !labListed(lab, now)) throw new ConvexError(LAB_REFUSE.labClosed);
    if (lab.paused) throw new ConvexError(LAB_REFUSE.labPaused);

    const wanted = [...new Set(args.analyses)];
    if (wanted.length === 0) throw new ConvexError(LAB_REFUSE.analyses);
    const prices = lab.prices ?? [];
    const analyses = wanted.map((a) => {
      const p = prices.find((x) => x.analysis === a);
      if (!p) throw new ConvexError(LAB_REFUSE.notPriced);
      return p;
    });

    let listingId: Id<"listings"> | undefined;
    let saleId: Id<"sales"> | undefined;
    if (args.listingId) {
      const listing = await ctx.db.get(args.listingId);
      if (!listing || client.kind !== "farm" || listing.companyId !== client._id) {
        throw new ConvexError(LAB_REFUSE.notYourLot);
      }
      if (listing.status !== "open") throw new ConvexError(LAB_REFUSE.listingClosed);
      listingId = listing._id;
    }
    if (args.saleId) {
      const sale = await ctx.db.get(args.saleId);
      if (!sale || client.kind !== "factory" || sale.buyerId !== client._id) throw new ConvexError(LAB_REFUSE.notYourSale);
      saleId = sale._id;
      listingId = sale.listingId;
    }

    const sample = cleanSample(args.sample, now);
    const tracking = optionalText(args.tracking, 60, LAB_REFUSE.tracking);
    return await ctx.db.insert("labRequests", {
      labId: lab._id,
      clientId: client._id,
      clientKind: client.kind,
      listingId,
      saleId,
      analyses,
      totalDzd: analyses.reduce((sum, a) => sum + a.priceDzd, 0),
      sample,
      delivery: args.delivery,
      tracking,
      status: "requested",
      paid: false,
      createdBy: user._id,
      createdAt: now,
    });
  },
});

/** The client withdraws its request while the lab does not have the sample yet. */
export const cancel = mutation({
  args: { requestId: v.id("labRequests") },
  handler: async (ctx, { requestId }) => {
    const req = await getRequest(ctx, requestId);
    await requireClient(ctx, req);
    const now = Date.now();
    const status = await statusOf(ctx, req, now);
    if (status === "received") throw new ConvexError(LAB_REFUSE.tooLate);
    if (status !== "requested" && status !== "accepted") throw new ConvexError(LAB_REFUSE.closed);
    await ctx.db.patch(requestId, { status: "cancelled", cancelledBy: "client" });
    return null;
  },
});

/** The client adds or changes the courier tracking number. */
export const setTracking = mutation({
  args: { requestId: v.id("labRequests"), tracking: v.string() },
  handler: async (ctx, args) => {
    const req = await getRequest(ctx, args.requestId);
    await requireClient(ctx, req);
    const status = await statusOf(ctx, req, Date.now());
    if (status !== "requested" && status !== "accepted") throw new ConvexError(LAB_REFUSE.closed);
    await ctx.db.patch(args.requestId, { tracking: optionalText(args.tracking, 60, LAB_REFUSE.tracking) });
    return null;
  },
});

/** The lab accepts or declines (with a reason) a waiting request. */
export const respond = mutation({
  args: { requestId: v.id("labRequests"), accept: v.boolean(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const req = await getRequest(ctx, args.requestId);
    await requireLab(ctx, req.labId, "manager");
    const now = Date.now();
    if ((await statusOf(ctx, req, now)) !== "requested") throw new ConvexError(LAB_REFUSE.closed);
    if (args.accept) {
      await ctx.db.patch(args.requestId, { status: "accepted", respondedAt: now });
    } else {
      await ctx.db.patch(args.requestId, { status: "declined", reason: cleanReason(args.reason), respondedAt: now });
    }
    return null;
  },
});

/**
 * The sample arrived: it gets the lab's sample number and a due date. Allowed even after the
 * 30-day wait has passed — the sample is physically there.
 */
export const receive = mutation({
  args: { requestId: v.id("labRequests"), condition: v.optional(v.string()), dueAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const req = await getRequest(ctx, args.requestId);
    const { company: lab } = await requireLab(ctx, req.labId, "inspector");
    if (req.status !== "accepted") throw new ConvexError(LAB_REFUSE.closed);
    const now = Date.now();
    const condition = optionalText(args.condition, 500, LAB_REFUSE.condition);
    const days = Math.max(...req.analyses.map((a) => a.days));
    const dueAt = cleanDueAt(args.dueAt, now, days);
    const seq = (lab.requestSeq ?? 0) + 1;
    await ctx.db.patch(lab._id, { requestSeq: seq });
    await ctx.db.patch(args.requestId, {
      status: "received",
      receivedAt: now,
      dueAt,
      condition,
      sampleNo: sampleNo(new Date(now).getUTCFullYear(), seq),
    });
    return null;
  },
});

/** The lab cancels an accepted request (before the sample) or an unsuitable sample, with a reason. */
export const reject = mutation({
  args: { requestId: v.id("labRequests"), reason: v.string() },
  handler: async (ctx, args) => {
    const req = await getRequest(ctx, args.requestId);
    await requireLab(ctx, req.labId, "manager");
    if (req.status !== "accepted" && req.status !== "received") throw new ConvexError(LAB_REFUSE.closed);
    await ctx.db.patch(args.requestId, { status: "cancelled", cancelledBy: "lab", reason: cleanReason(args.reason) });
    return null;
  },
});

/** Analysts and heads save unfinished results. */
export const saveDraft = mutation({
  args: { requestId: v.id("labRequests"), results: labResultsDoc },
  handler: async (ctx, args) => {
    const req = await getRequest(ctx, args.requestId);
    await requireLab(ctx, req.labId, "inspector");
    if (req.status !== "received") throw new ConvexError(LAB_REFUSE.closed);
    const draft = cleanResults(
      args.results,
      req.analyses.map((a) => a.analysis),
      req.receivedAt!,
      Date.now(),
      { draft: true },
    );
    await ctx.db.patch(args.requestId, { draft });
    return null;
  },
});

/** Issues a frozen certificate version; returns its verify code. */
async function issue(
  ctx: MutationCtx,
  req: Doc<"labRequests">,
  results: Results,
  by: { user: Doc<"users">; role: string; lab: Doc<"companies"> },
  version: number,
  amendReason?: string,
) {
  const client = await ctx.db.get(req.clientId);
  const now = Date.now();
  const scored = lotScore(req.sample.residue, req.sample.state, results);
  let code = verifyCode();
  while (await ctx.db.query("labReports").withIndex("by_code", (q) => q.eq("code", code)).first()) code = verifyCode();
  const reportId = await ctx.db.insert("labReports", {
    requestId: req._id,
    labId: req.labId,
    version,
    code,
    reportNo: `${req.sampleNo}-R${version}`,
    lab: { name: by.lab.name, address: by.lab.address ?? "", phone: by.lab.phone ?? "" },
    client: { name: client?.name ?? "", region: client?.region ?? "" },
    sample: req.sample,
    sampleNo: req.sampleNo!,
    condition: req.condition,
    receivedAt: req.receivedAt!,
    retention: by.lab.retention ?? "30 days",
    results,
    releasedByName: by.user.name,
    releasedByRole: by.role,
    amendReason,
    score: scored?.score,
    route: scored?.route,
    releasedAt: now,
  });
  if (req.reportId) await ctx.db.patch(req.reportId, { replacedBy: reportId });
  await ctx.db.patch(req._id, { status: "released", releasedAt: now, reportId, draft: undefined });
  return code;
}

/** Owners and managers release the results: certificate version 1. */
export const release = mutation({
  args: { requestId: v.id("labRequests"), results: labResultsDoc },
  handler: async (ctx, args) => {
    const req = await getRequest(ctx, args.requestId);
    const { user, membership, company } = await requireLab(ctx, req.labId, "manager");
    if (req.status !== "received") throw new ConvexError(LAB_REFUSE.closed);
    const results = cleanResults(args.results, req.analyses.map((a) => a.analysis), req.receivedAt!, Date.now());
    return await issue(ctx, req, results, { user, role: membership.role, lab: company }, 1);
  },
});

/** Released results are never edited: an amendment issues the next version, with its reason. */
export const amend = mutation({
  args: { requestId: v.id("labRequests"), results: labResultsDoc, reason: v.string() },
  handler: async (ctx, args) => {
    const req = await getRequest(ctx, args.requestId);
    const { user, membership, company } = await requireLab(ctx, req.labId, "manager");
    if (req.status !== "released" || !req.reportId) throw new ConvexError(LAB_REFUSE.notReleased);
    const reason = cleanReason(args.reason);
    const results = cleanResults(args.results, req.analyses.map((a) => a.analysis), req.receivedAt!, Date.now());
    const current = await ctx.db.get(req.reportId);
    return await issue(ctx, req, results, { user, role: membership.role, lab: company }, (current?.version ?? 1) + 1, reason);
  },
});

/** The lab's own bookkeeping: has the client paid? */
export const setPaid = mutation({
  args: { requestId: v.id("labRequests"), paid: v.boolean() },
  handler: async (ctx, args) => {
    const req = await getRequest(ctx, args.requestId);
    await requireLab(ctx, req.labId, "manager");
    await ctx.db.patch(args.requestId, { paid: args.paid });
    return null;
  },
});

/** Every request sent to the lab, newest first, with the client's contact. Any lab member. */
export const labQueue = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireLab(ctx, companyId, "inspector");
    const now = Date.now();
    const lab = await ctx.db.get(companyId);
    const labOpen = lab !== null && labListed(lab, now);
    const rows = await ctx.db
      .query("labRequests")
      .withIndex("by_lab", (q) => q.eq("labId", companyId))
      .order("desc")
      .take(500);
    const out = [];
    for (const r of rows) {
      const client = await ctx.db.get(r.clientId);
      out.push({
        requestId: r._id,
        status: effectiveStatus(r, now, labOpen),
        overdue: isOverdue(r, now),
        clientName: client?.name ?? "",
        clientPhone: client?.phone ?? "",
        clientRegion: client?.region ?? "",
        clientKind: r.clientKind,
        analyses: r.analyses,
        totalDzd: r.totalDzd,
        sample: r.sample,
        delivery: r.delivery,
        tracking: r.tracking,
        sampleNo: r.sampleNo,
        receivedAt: r.receivedAt,
        dueAt: r.dueAt,
        condition: r.condition,
        reason: r.reason,
        cancelledBy: r.cancelledBy,
        draft: r.draft,
        reports: await reportsOf(ctx, r._id),
        paid: r.paid,
        createdAt: r.createdAt,
      });
    }
    return out;
  },
});

/** The farm's or factory's requests, newest first, with the lab's contact. Any member. */
export const myRequests = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireMember(ctx, companyId);
    const now = Date.now();
    const rows = await ctx.db
      .query("labRequests")
      .withIndex("by_client", (q) => q.eq("clientId", companyId))
      .order("desc")
      .take(500);
    const out = [];
    for (const r of rows) {
      const lab = await ctx.db.get(r.labId);
      const listing = r.listingId ? await ctx.db.get(r.listingId) : null;
      out.push({
        requestId: r._id,
        status: effectiveStatus(r, now, lab !== null && labListed(lab, now)),
        labId: r.labId,
        labName: lab?.name ?? "",
        labPhone: lab?.phone ?? "",
        labAddress: lab?.address ?? "",
        labHours: lab?.hours ?? "",
        analyses: r.analyses,
        totalDzd: r.totalDzd,
        sample: r.sample,
        delivery: r.delivery,
        tracking: r.tracking,
        listingId: r.listingId,
        saleId: r.saleId,
        sampleNo: r.sampleNo,
        dueAt: r.dueAt,
        reason: r.reason,
        cancelledBy: r.cancelledBy,
        reports: await reportsOf(ctx, r._id),
        attached: listing?.labRequestId === r._id,
        createdAt: r.createdAt,
      });
    }
    return out;
  },
});

/** A certificate by its verify code, for anyone holding the code. Never the client's phone or the score. */
export const certificate = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const r = await ctx.db
      .query("labReports")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .first();
    if (!r) return null;
    const replaced = r.replacedBy ? await ctx.db.get(r.replacedBy) : null;
    return {
      code: r.code,
      reportNo: r.reportNo,
      version: r.version,
      replacedByCode: replaced?.code,
      amendReason: r.amendReason,
      lab: r.lab,
      client: r.client,
      sample: r.sample,
      sampleNo: r.sampleNo,
      condition: r.condition,
      receivedAt: r.receivedAt,
      testedFrom: r.results.testedFrom,
      testedTo: r.results.testedTo,
      releasedAt: r.releasedAt,
      releasedByName: r.releasedByName,
      releasedByRole: r.releasedByRole,
      retention: r.retention,
      results: r.results,
    };
  },
});

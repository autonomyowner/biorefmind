import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAppUser } from "./auth";
import { findMembership, requireMember, SIGN_IN } from "./lib/access";
import { cleanName, cleanPhone, cleanRegion, LAB_TRIAL_MS, labListed, pickKnown, REFUSE } from "./lib/accounts";
import { ANALYSES, RESIDUES } from "./lib/catalog";

const INVITE_REFUSAL = "Only owners and managers can invite people.";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const kind = v.union(v.literal("farm"), v.literal("lab"), v.literal("factory"));

/** The caller's workspaces with their profile and plan. `listed` is set for labs only. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAppUser(ctx);
    if (!user) return [];
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const now = Date.now();
    const out = [];
    for (const m of memberships) {
      const c = await ctx.db.get(m.companyId);
      if (!c) continue;
      out.push({
        companyId: c._id,
        name: c.name,
        kind: c.kind,
        role: m.role,
        region: c.region ?? "",
        phone: c.phone ?? "",
        services: c.services,
        buys: c.buys,
        plan: c.plan,
        trialEndsAt: c.trialEndsAt,
        paidUntil: c.paidUntil,
        listed: c.kind === "lab" ? labListed(c, now) : undefined,
      });
    }
    return out;
  },
});

/** A new farm (free), lab (14-day trial) or factory (enterprise) owned by the caller. */
export const create = mutation({
  args: {
    kind,
    name: v.string(),
    region: v.string(),
    phone: v.string(),
    services: v.optional(v.array(v.string())),
    buys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getAppUser(ctx);
    if (!user) {
      // Signed in but no profile yet vs. not signed in at all.
      const identity = await ctx.auth.getUserIdentity();
      throw new ConvexError(identity ? "Please finish creating your account first." : SIGN_IN);
    }
    const name = cleanName(args.name);
    const region = cleanRegion(args.region);
    const phone = cleanPhone(args.phone);
    const services = args.kind === "lab" ? pickKnown(args.services ?? [], ANALYSES) : undefined;
    if (services && services.length === 0) throw new ConvexError(REFUSE.services);
    const buys = args.kind === "factory" ? pickKnown(args.buys ?? [], RESIDUES) : undefined;
    if (args.kind === "farm") {
      const owned = await ctx.db
        .query("companies")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();
      if (owned.some((c) => c.kind === "farm")) throw new ConvexError(REFUSE.oneFarm);
    }
    const now = Date.now();
    const companyId = await ctx.db.insert("companies", {
      name,
      kind: args.kind,
      region,
      phone,
      services,
      buys,
      ownerId: user._id,
      plan: args.kind === "farm" ? "free" : args.kind === "lab" ? "lab_trial" : "enterprise",
      trialEndsAt: args.kind === "lab" ? now + LAB_TRIAL_MS : undefined,
      shipmentSeq: 0,
      createdAt: now,
    });
    await ctx.db.insert("memberships", { companyId, userId: user._id, role: "owner", createdAt: now });
    return companyId;
  },
});

/** Owners and managers edit the profile others see. Only the fields given change. */
export const updateProfile = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.optional(v.string()),
    region: v.optional(v.string()),
    phone: v.optional(v.string()),
    services: v.optional(v.array(v.string())),
    buys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { company } = await requireMember(ctx, args.companyId, "manager");
    const patch: Partial<Doc<"companies">> = {};
    if (args.name !== undefined) patch.name = cleanName(args.name);
    if (args.region !== undefined) patch.region = cleanRegion(args.region);
    if (args.phone !== undefined) patch.phone = cleanPhone(args.phone);
    if (args.services !== undefined && company.kind === "lab") {
      patch.services = pickKnown(args.services, ANALYSES);
      if (patch.services.length === 0) throw new ConvexError(REFUSE.services);
    }
    if (args.buys !== undefined && company.kind === "factory") patch.buys = pickKnown(args.buys, RESIDUES);
    await ctx.db.patch(args.companyId, patch);
    return null;
  },
});

export const members = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireMember(ctx, companyId);
    const rows = await ctx.db
      .query("memberships")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();
    const out = [];
    for (const m of rows) {
      const u = await ctx.db.get(m.userId);
      if (u) out.push({ userId: u._id, name: u.name, email: u.email, role: m.role });
    }
    return out;
  },
});

export const invite = mutation({
  args: {
    companyId: v.id("companies"),
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("inspector")),
  },
  handler: async (ctx, args) => {
    const { user, company } = await requireMember(ctx, args.companyId, "manager", INVITE_REFUSAL);
    if (company.kind === "farm") throw new ConvexError(REFUSE.farmInvite);
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) throw new ConvexError("Please enter a valid email address.");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existingUser && (await findMembership(ctx, args.companyId, existingUser._id))) {
      throw new ConvexError("This person is already in your workspace.");
    }

    // One pending invitation per email per workspace: re-inviting updates the role.
    const pending = (
      await ctx.db
        .query("invitations")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect()
    ).find((i) => i.companyId === args.companyId && i.status === "pending");
    if (pending) {
      await ctx.db.patch(pending._id, { role: args.role, invitedBy: user._id });
      return pending._id;
    }
    return await ctx.db.insert("invitations", {
      companyId: args.companyId,
      email,
      role: args.role,
      invitedBy: user._id,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const invitations = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    await requireMember(ctx, companyId);
    const rows = await ctx.db
      .query("invitations")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();
    return rows
      .filter((i) => i.status === "pending")
      .map((i) => ({ _id: i._id, email: i.email, role: i.role, createdAt: i.createdAt }));
  },
});

export const revokeInvitation = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, { invitationId }) => {
    const inv = await ctx.db.get(invitationId);
    if (!inv) throw new ConvexError("This invitation no longer exists.");
    await requireMember(ctx, inv.companyId, "manager", INVITE_REFUSAL);
    if (inv.status === "pending") await ctx.db.patch(invitationId, { status: "revoked" });
    return null;
  },
});

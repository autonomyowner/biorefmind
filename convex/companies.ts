import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAppUser } from "./auth";
import { findMembership, requireMember, SIGN_IN } from "./lib/access";

const TRIAL_MS = 14 * 24 * 60 * 60 * 1000;
const INVITE_REFUSAL = "Only owners and managers can invite people.";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAppUser(ctx);
    if (!user) return [];
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const out = [];
    for (const m of memberships) {
      const c = await ctx.db.get(m.companyId);
      if (!c) continue;
      out.push({ companyId: c._id, name: c.name, kind: c.kind, role: m.role, plan: c.plan, trialEndsAt: c.trialEndsAt });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    kind: v.union(v.literal("factory"), v.literal("lab")),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAppUser(ctx);
    if (!user) {
      // Signed in but no profile yet vs. not signed in at all.
      const identity = await ctx.auth.getUserIdentity();
      throw new ConvexError(identity ? "Please finish creating your account first." : SIGN_IN);
    }
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new ConvexError("Company name must be 2–80 characters.");
    const country = args.country?.trim().slice(0, 80) || undefined;
    const now = Date.now();
    const companyId = await ctx.db.insert("companies", {
      name,
      kind: args.kind,
      country,
      ownerId: user._id,
      plan: "trial",
      trialEndsAt: now + TRIAL_MS,
      shipmentSeq: 0,
      createdAt: now,
    });
    await ctx.db.insert("memberships", { companyId, userId: user._id, role: "owner", createdAt: now });
    return companyId;
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
    const { user } = await requireMember(ctx, args.companyId, "manager", INVITE_REFUSAL);
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

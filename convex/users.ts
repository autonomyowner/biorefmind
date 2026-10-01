import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAppUser, getLoginEmail } from "./auth";
import { SIGN_IN } from "./lib/access";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAppUser(ctx);
    return user ? { _id: user._id, email: user.email, name: user.name } : null;
  },
});

/**
 * Creates the profile for the signed-in login, or returns the existing one,
 * then turns any pending invitations for that email into memberships.
 */
export const ensureUser = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const email = await getLoginEmail(ctx);
    if (!email) throw new ConvexError(SIGN_IN);
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 80) throw new ConvexError("Please enter your name.");

    const now = Date.now();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const userId = user ? user._id : await ctx.db.insert("users", { email, name: clean, createdAt: now });

    const invites = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    for (const inv of invites) {
      if (inv.status !== "pending") continue;
      const existing = await ctx.db
        .query("memberships")
        .withIndex("by_company_user", (q) => q.eq("companyId", inv.companyId).eq("userId", userId))
        .first();
      if (!existing && (await ctx.db.get(inv.companyId))) {
        await ctx.db.insert("memberships", { companyId: inv.companyId, userId, role: inv.role, createdAt: now });
      }
      await ctx.db.patch(inv._id, { status: "accepted" });
    }
    return userId;
  },
});

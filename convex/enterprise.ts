import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireMember } from "./lib/access";
import { REFUSE } from "./lib/accounts";

/** A factory asks BiorefMind for custom pricing; admins read it on the admin page. */
export const request = mutation({
  args: { companyId: v.id("companies"), message: v.string() },
  handler: async (ctx, { companyId, message }) => {
    const { user, company } = await requireMember(ctx, companyId);
    if (company.kind !== "factory") throw new ConvexError(REFUSE.enterpriseKind);
    const text = message.trim();
    if (text.length < 1 || text.length > 1000) throw new ConvexError(REFUSE.enterpriseMessage);
    await ctx.db.insert("enterpriseRequests", { companyId, userId: user._id, message: text, createdAt: Date.now() });
    return null;
  },
});

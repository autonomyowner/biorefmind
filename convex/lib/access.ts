import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAppUser } from "../auth";

export type Role = "owner" | "manager" | "inspector";
const RANK: Record<Role, number> = { owner: 3, manager: 2, inspector: 1 };

export const SIGN_IN = "Please sign in to continue.";
export const NO_ACCESS = "You don't have access to this workspace.";

/** The signed-in profile, or the sign-in refusal. */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await getAppUser(ctx);
  if (!user) throw new ConvexError(SIGN_IN);
  return user;
}

/** The caller's membership of `companyId`, or null. Never throws. */
export async function findMembership(ctx: QueryCtx | MutationCtx, companyId: Id<"companies">, userId: Id<"users">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_company_user", (q) => q.eq("companyId", companyId).eq("userId", userId))
    .first();
}

/**
 * Signed in, a member of `companyId`, and at least `minRole`.
 * `roleRefusal` is the text shown when the role is too low.
 */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">,
  minRole: Role = "inspector",
  roleRefusal: string = NO_ACCESS,
): Promise<{ user: Doc<"users">; membership: Doc<"memberships">; company: Doc<"companies"> }> {
  const user = await requireUser(ctx);
  const company = await ctx.db.get(companyId);
  if (!company) throw new ConvexError(NO_ACCESS);
  const membership = await findMembership(ctx, companyId, user._id);
  if (!membership) throw new ConvexError(NO_ACCESS);
  if (RANK[membership.role] < RANK[minRole]) throw new ConvexError(roleRefusal);
  return { user, membership, company };
}

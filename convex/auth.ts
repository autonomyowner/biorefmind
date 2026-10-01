import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error("SITE_URL environment variable is required");
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    trustedOrigins: [siteUrl, "http://localhost:3000"],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    account: { accountLinking: { disableImplicitLinking: true } },
    // In the database, not memory: Convex isolates are short-lived.
    rateLimit: { enabled: true, storage: "database" },
    plugins: [convex({ authConfig })],
  });
};

/**
 * The caller's app profile, linked to the Better Auth login by email.
 * Null when signed out or when the login has no profile yet.
 * `getAuthUser` throws when unauthenticated, hence the try/catch.
 */
export async function getAppUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const email = await getLoginEmail(ctx);
  if (!email) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
}

/** The signed-in login's email, lowercased, from the Better Auth user row. Null when signed out. */
export async function getLoginEmail(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  try {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    return authUser?.email ? authUser.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

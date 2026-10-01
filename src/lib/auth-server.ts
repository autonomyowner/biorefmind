import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

/**
 * Server-side Better Auth, mounted on this app's own origin.
 *
 * Auth requests go to `/api/auth/*` on aitridi.com and are proxied from there to
 * the Convex deployment. That indirection is the whole point: cookies issued by
 * `convex.site` are `SameSite=Lax`, so a browser on aitridi.com would never send
 * them back on a cross-site fetch and no session would survive a reload.
 * Proxying makes the session cookie first-party.
 *
 * `getToken` and `isAuthenticated` read that cookie, so they are available to
 * server components and route handlers.
 */
export const {
  handler,
  getToken,
  isAuthenticated,
  preloadAuthQuery,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

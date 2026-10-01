import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

/**
 * Better Auth's browser client.
 *
 * No `baseURL`: it defaults to this app's own origin, where the route handler at
 * `/api/auth/[...all]` proxies through to Convex. Pointing it straight at the
 * Convex site URL instead would make the session cookie cross-site, and a
 * `SameSite=Lax` cookie is never sent on a cross-site fetch.
 *
 * The `convexClient` plugin is what makes the session mint a Convex-verifiable JWT.
 */
export const authClient = createAuthClient({
  plugins: [convexClient()],
});

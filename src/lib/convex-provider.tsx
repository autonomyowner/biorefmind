"use client";

import { useState } from "react";
import { ConvexReactClient } from "convex/react";
import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from "@convex-dev/better-auth/react";

import { authClient } from "@/lib/auth-client";

/**
 * Wraps the app in a Convex client that carries the Better Auth session.
 *
 * The client is created lazily in state rather than at module scope so a single
 * Worker isolate serving many requests never shares one client across them.
 */
export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // No `expectAuth`: it holds every request until a login token arrives, and
  // a guest never gets one, so the public pages' live queries (the
  // marketplace's listings, the exchange rate behind the USD / DA switch)
  // would never answer. Queries that need a login wait on their own:
  // `useSession` skips `users.viewer` until Convex confirms the token, and the
  // signed-in areas render only once the profile is there.
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));

  return (
    // The cast is the library's own type quirk, not a mismatch: its exported
    // `AuthClient` intersects `BetterAuthClientPlugin` with the plugins array,
    // which collapses `useSession().data` to `never`, so no real client is ever
    // assignable. The runtime shape is correct.
    <ConvexBetterAuthProvider
      client={client}
      authClient={authClient as unknown as AuthClient}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}

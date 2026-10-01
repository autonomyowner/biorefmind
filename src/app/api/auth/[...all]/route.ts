import { handler } from "@/lib/auth-server";

/**
 * Better Auth's endpoints, served from this app's origin so the session cookie
 * is first-party. See `src/lib/auth-server.ts`.
 */
export const { GET, POST } = handler;

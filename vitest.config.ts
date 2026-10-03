import { defineConfig } from "vitest/config";

/**
 * Backend tests for `convex/`, run with convex-test in the edge runtime Convex
 * functions use. The Better Auth component ships its own test registration
 * that loads its modules with `import.meta.glob`, so it is inlined too.
 */
export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts", "src/**/*.test.ts"],
    // The first call into the backend loads every Convex module through Vite (slow on Windows).
    testTimeout: 30_000,
    // `convex/auth.ts` refuses to build Better Auth without it; tests never use its HTTP side.
    env: { SITE_URL: "http://localhost:3000" },
    server: { deps: { inline: ["convex-test", "@convex-dev/better-auth"] } },
  },
});

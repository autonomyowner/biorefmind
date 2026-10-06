// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §1

/** Every dashboard page. Which ones an account sees is decided in the shell. */
export const DASH = {
  overview: "/dashboard",
  listings: "/dashboard/listings",
  sales: "/dashboard/sales",
  browse: "/dashboard/browse",
  offers: "/dashboard/offers",
  labs: "/dashboard/labs",
  requests: "/dashboard/requests",
  prices: "/dashboard/prices",
  analytics: "/dashboard/analytics",
  plan: "/dashboard/plan",
  settings: "/dashboard/settings",
} as const;

export type DashPage = keyof typeof DASH;

/** Adds `?guest=1` while in the guest preview, so every link stays in the preview. */
export function withGuest(href: string, guest: boolean): string {
  if (!guest) return href;
  const [path, hash] = href.split("#");
  const joined = `${path}${path.includes("?") ? "&" : "?"}guest=1`;
  return hash === undefined ? joined : `${joined}#${hash}`;
}

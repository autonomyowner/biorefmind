import { DASH, type DashPage } from "./links";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §1 ("Old links keep working")

/** Anchors of the old one-page dashboard → the page that now holds that section (and an optional query). */
const OLD_ANCHORS: Record<string, { page: DashPage; query?: string }> = {
  listings: { page: "listings" },
  sales: { page: "sales" },
  labtests: { page: "labs" },
  labs: { page: "labs", query: "tab=find" },
  browse: { page: "browse" },
  offers: { page: "offers" },
  enterprise: { page: "settings" },
  requests: { page: "requests" },
  prices: { page: "prices" },
  profile: { page: "settings" },
  plan: { page: "plan" },
};

/**
 * Where an old `/dashboard#section` link should go now, or null to stay on the Overview
 * (no hash, an unknown one, or a page this account does not have). Without `?guest=1`.
 */
export function forwardHash(hash: string, allowed: readonly DashPage[]): string | null {
  const key = hash.replace(/^#/, "");
  const target = Object.hasOwn(OLD_ANCHORS, key) ? OLD_ANCHORS[key] : undefined;
  if (!target || !allowed.includes(target.page)) return null;
  return target.query ? `${DASH[target.page]}?${target.query}` : DASH[target.page];
}

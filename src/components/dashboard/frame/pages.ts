import type { Kind } from "@/lib/types";
import { DASH, type DashPage } from "../links";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §1 (pages per account, sidebar order)

/** The pages each account type has, in sidebar order. Settings is always last (the "General" group). */
export const PAGES: Record<Kind, readonly DashPage[]> = {
  farm: ["overview", "listings", "sales", "labs", "analytics", "settings"],
  factory: ["overview", "browse", "offers", "sales", "labs", "analytics", "settings"],
  lab: ["overview", "requests", "prices", "analytics", "plan", "settings"],
};

/** The dashboard page a path belongs to ("/dashboard/labs/x" → "labs"), or null outside the dashboard. */
export function pageOfPath(pathname: string): DashPage | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  if (path === DASH.overview) return "overview";
  for (const [page, href] of Object.entries(DASH) as [DashPage, string][]) {
    if (page !== "overview" && (path === href || path.startsWith(`${href}/`))) return page;
  }
  return null;
}

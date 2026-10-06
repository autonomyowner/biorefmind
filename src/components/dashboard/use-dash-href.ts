"use client";

import { withGuest } from "@/components/dashboard/links";
import { useDashboard } from "@/components/dashboard/shell";

/** `href(DASH.sales)` → "/dashboard/sales" (or "/dashboard/sales?guest=1" in the preview). */
export function useDashHref(): (href: string) => string {
  const { guest } = useDashboard();
  return (href) => withGuest(href, guest);
}

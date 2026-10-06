import type { Locale } from "@/i18n/locale";
// Relative import: vitest has no "@/" alias.
import { formatDzd, formatKg } from "../../../lib/pricing";
import type { WorkspaceInsights } from "@/lib/types";

// How each KPI key of insights.workspace (design §7) is printed and read.

type Kpi = WorkspaceInsights["kpis"][number];
type Kind = WorkspaceInsights["kind"];
export type Unit = "dzd" | "kg" | "count" | "rate" | "days";

const DAY = 86_400_000;
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function unitOf(key: string): Unit {
  if (key.endsWith("Dzd") || key === "avgDzdPerKg") return "dzd";
  if (key.endsWith("Kg")) return "kg";
  if (key.endsWith("Rate")) return "rate";
  if (key.endsWith("Days")) return "days";
  return "count";
}

/** Prints one value of the unit (Latin digits); `daysText` is the "{n} days" message. */
export function formatUnit(unit: Unit, n: number, locale: Locale, daysText: string): string {
  switch (unit) {
    case "dzd":
      return formatDzd(n, locale);
    case "kg":
      return formatKg(n, locale);
    case "rate":
      return `${Math.round(n * 100)}%`;
    case "days":
      return daysText.replace("{n}", (Math.round(n * 10) / 10).toFixed(1));
    default:
      return whole.format(n);
  }
}

export function formatKpi(key: string, n: number, locale: Locale, daysText: string): string {
  return formatUnit(unitOf(key), n, locale, daysText);
}

/** The four tiles: the factory's acceptance rate is shown as the "offers sent" caption instead. */
export function shownKpis(kpis: Kpi[]): Kpi[] {
  return kpis.filter((k) => k.key !== "acceptRate");
}

/** Where a rise is bad news (slower results, dearer purchases), so the change shows in red. */
export function lowerIsBetter(kind: Kind, key: string): boolean {
  return key === "avgTurnaroundDays" || (kind === "factory" && key === "avgDzdPerKg");
}

/** UTC midnight of the activity grid's first day (140 days ending today). */
export function activityStart(d: Pick<WorkspaceInsights, "start" | "days">): number {
  return d.start + (d.days - 1) * DAY - 139 * DAY;
}

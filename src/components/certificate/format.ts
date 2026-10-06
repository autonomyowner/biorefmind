/** Pure formatting for the certificate of analysis (shared by the page and its tests). */

export type Qualifier = "<" | ">" | "nd" | undefined;

const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

/** A number as printed: Latin digits, thousands separators ("120,000", "0.35"). */
export function formatNumber(n: number): string {
  return NUMBER.format(n);
}

/** A result with its qualifier: "12.5", "< 10", "> 5", or the "not detected" text. */
export function formatResult(value: number, qualifier: Qualifier, notDetected: string): string {
  if (qualifier === "nd") return notDetected;
  if (qualifier === "<" || qualifier === ">") return `${qualifier} ${formatNumber(value)}`;
  return formatNumber(value);
}

/** A calendar day in Algeria's time zone as YYYY-MM-DD (unambiguous in both languages). */
export function formatDate(ms: number): string {
  // en-CA prints ISO-style dates.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Algiers",
  }).format(ms);
}

/** True when any panel line was assessed against a limit (the §7.8.6 statement is then printed). */
export function hasConformity(results: { panels: { lines: { pass?: boolean }[] }[] }): boolean {
  return results.panels.some((p) => p.lines.some((l) => l.pass !== undefined));
}

/** Fill "{name}" slots in a message. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
}

/** A verify code as typed by a person: trimmed, no inner spaces or dashes, upper case. */
export function normalizeCode(raw: string): string {
  return raw.replace(/[\s-]+/g, "").toUpperCase();
}

/** CSS for the printed page: A4, and "Report <no> — Page x of y" in the bottom margin of every page. */
export function printPageCss(reportLabel: string, page: string, of: string): string {
  const q = (s: string) => `"${s.replace(/[\\"]/g, "\\$&").replace(/[<>\n\r]/g, "")}"`;
  return (
    `@page{size:A4 portrait;margin:16mm 15mm 18mm;` +
    `@bottom-left{content:${q(reportLabel)};font:9pt sans-serif;color:#475569}` +
    `@bottom-right{content:${q(page + " ")} counter(page) ${q(" " + of + " ")} counter(pages);font:9pt sans-serif;color:#475569}}`
  );
}

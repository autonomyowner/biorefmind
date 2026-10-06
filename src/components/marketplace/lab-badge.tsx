"use client";

import { ExternalLink, FlaskConical } from "lucide-react";

import { labBadgeMessages } from "@/components/marketplace/lab-badge-messages";
import { useLocale, useMessages } from "@/i18n/provider";
import type { Locale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

// Design: docs/superpowers/specs/2026-10-06-lab-requests-design.md (decision 9).

/** A lot's attached lab results, as market.publicLots / market.browse return them (`code` only when signed in). */
export type LotLab = { labName: string; releasedAt: number; score?: number; route?: "A" | "B" | "C"; code?: string };

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

function formatDay(ms: number, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Algiers",
  }).format(ms);
}

/**
 * "Lab-tested by <lab>, <date>", plus BiorefMind's score and route when there is one.
 * `detail` adds the disclaimer; a certificate link appears whenever the code is known.
 */
export function LabBadge({ lab, detail = false, className }: { lab: LotLab; detail?: boolean; className?: string }) {
  const t = useMessages(labBadgeMessages);
  const locale = useLocale();
  return (
    <div
      title={detail ? undefined : t.disclaimer}
      className={cn("rounded-2xl border border-azure/15 bg-azure/[0.07] px-3 py-2.5 text-[13px] leading-snug text-[#24366a]", className)}
    >
      <p className="flex min-w-0 items-center gap-2">
        <FlaskConical className="size-4 shrink-0 text-azure" strokeWidth={1.9} />
        <span className="shrink-0 font-semibold text-foreground">{t.tested}</span>
        <span className="min-w-0 truncate">
          <bdi>{fill(t.by, { lab: lab.labName })}</bdi> · {formatDay(lab.releasedAt, locale)}
        </span>
      </p>
      {lab.score !== undefined || lab.route ? (
        <p className="mt-1 ps-6 font-medium">
          {lab.score !== undefined ? <span>{fill(t.score, { score: Math.round(lab.score) })}</span> : null}
          {lab.score !== undefined && lab.route ? " · " : null}
          {lab.route ? <span>{fill(t.route, { route: `${lab.route} ${t.routes[lab.route]}` })}</span> : null}
        </p>
      ) : null}
      {detail ? <p className="mt-1.5 ps-6 text-[12px] text-[#24366a]/80">{t.disclaimer}</p> : null}
      {lab.code ? (
        <a
          href={`/verify/${lab.code}`}
          target="_blank"
          rel="noopener"
          className="mt-1.5 ms-6 inline-flex items-center gap-1.5 font-semibold text-azure underline-offset-2 hover:underline"
        >
          {t.view}
          <ExternalLink className="size-3.5" strokeWidth={2} />
        </a>
      ) : null}
    </div>
  );
}

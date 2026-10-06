"use client";

import { AlertTriangle, CheckCircle2, CircleHelp, Lightbulb, ScanSearch, XCircle } from "lucide-react";

import { photoCheckMessages } from "@/components/marketplace/photo-check-messages";
import { useLocale, useMessages } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import type { PhotoCheckResult } from "../../../convex/lib/ai";

// Design: docs/superpowers/specs/2026-10-06-ai-photo-check-design.md

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

const MATCH_ICON = { yes: CheckCircle2, unsure: CircleHelp, no: XCircle } as const;
const MATCH_TONE = { yes: "text-[#12a26a]", unsure: "text-violet", no: "text-[#c2410c]" } as const;

/** One line for lot cards: "AI photo check · Looks like … · Dried · 1 thing to check". */
export function PhotoCheckLine({ check, residue, className }: { check: PhotoCheckResult; residue: string; className?: string }) {
  const t = useMessages(photoCheckMessages);
  const Icon = MATCH_ICON[check.match];
  const n = check.concerns.length;
  return (
    <p
      title={t.disclaimer}
      className={cn("flex min-w-0 items-center gap-2 rounded-2xl border border-violet/15 bg-violet/[0.06] px-3 py-2 text-[13px] text-[#2e2a6b]", className)}
    >
      <Icon className={cn("size-4 shrink-0", MATCH_TONE[check.match])} strokeWidth={2} />
      <span className="min-w-0 truncate">
        <span className="font-semibold text-foreground">{fill(t.match[check.match], { residue })}</span>
        {" · "}
        {t.state[check.state]}
        {" · "}
        <span className={n ? "text-[#a8620a]" : undefined}>
          {n === 0 ? t.noConcerns : n === 1 ? t.concernCount.one : fill(t.concernCount.other, { n })}
        </span>
      </span>
    </p>
  );
}

/**
 * The full box: what the AI saw, fresh or dried, visible concerns, a tip, and the "not a lab result" line.
 * `action` (optional) sits under the disclaimer, e.g. the farmer's "Find a lab" link.
 */
export function PhotoCheckBox({
  check,
  residue,
  action,
  className,
}: {
  check: PhotoCheckResult;
  residue: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = useMessages(photoCheckMessages);
  const locale = useLocale();
  const Icon = MATCH_ICON[check.match];
  return (
    <section className={cn("rounded-2xl border border-violet/15 bg-violet/[0.06] px-3.5 py-3 text-[13px] leading-snug text-[#2e2a6b]", className)}>
      <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-violet">
        <ScanSearch className="size-4 shrink-0" strokeWidth={1.9} />
        {t.title}
      </p>
      <p className="mt-2 flex items-start gap-2">
        <Icon className={cn("mt-px size-4 shrink-0", MATCH_TONE[check.match])} strokeWidth={2} />
        <span>
          <span className="font-semibold text-foreground">{fill(t.match[check.match], { residue })}</span>
          {" · "}
          {t.state[check.state]}
          <span className="mt-0.5 block text-[#2e2a6b]/85">{check.seen[locale]}</span>
        </span>
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5 ps-6">
        {check.concerns.length === 0 ? (
          <li className="rounded-full bg-[#dcf7ea] px-2.5 py-0.5 text-[12px] font-medium text-[#12a26a]">{t.noConcerns}</li>
        ) : (
          check.concerns.map((c) => (
            <li key={c} className="inline-flex items-center gap-1 rounded-full bg-[#fff1d6] px-2.5 py-0.5 text-[12px] font-medium text-[#a8620a]">
              <AlertTriangle className="size-3" strokeWidth={2.2} />
              {t.concerns[c]}
            </li>
          ))
        )}
      </ul>
      <p className="mt-2 flex items-start gap-2">
        <Lightbulb className="mt-px size-4 shrink-0 text-violet" strokeWidth={1.9} />
        <span>
          <span className="font-semibold">{t.tip}:</span> {check.tip[locale]}
        </span>
      </p>
      <p className="mt-2 ps-6 text-[12px] text-[#2e2a6b]/75">{t.disclaimer}</p>
      {action ? <div className="mt-2 ps-6">{action}</div> : null}
    </section>
  );
}

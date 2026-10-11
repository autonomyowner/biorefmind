"use client";

import { MessageCircle, Phone } from "lucide-react";

import { telHref, waHref } from "@/components/admin/admin-utils";
import { catalogLabels } from "@/lib/catalog-labels";
import { cn } from "@/lib/utils";

// Small pieces shared by the admin sections. The admin page stays English.

export const DAY = 86_400_000;

/** "11 Oct 2026", or "—" when there is no date. */
export function fmt(ms?: number) {
  return ms ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(ms) : "—";
}

/** "11 Oct 2026, 14:05". */
export function fmtTime(ms: number) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(ms);
}

export const RESIDUE_EN: Record<string, string> = catalogLabels.en.residues;
export const ANALYSIS_EN: Record<string, string> = catalogLabels.en.analyses;

/** Section card, field and button styles used across the admin page. */
export const SECTION = "glass mt-5 scroll-mt-24 rounded-[28px] p-5 sm:p-7";
export const ROW = "min-w-0 rounded-2xl border border-white bg-white/70 p-4 sm:p-5";
export const EMPTY = "mt-4 rounded-2xl bg-white/50 px-4 py-6 text-center text-[15px] text-muted-foreground";
export const FIELD =
  "h-10 w-full min-w-0 rounded-xl border border-foreground/10 bg-white/90 px-3.5 text-[14px] outline-none focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20";
export const AREA =
  "w-full min-w-0 resize-none rounded-xl border border-foreground/10 bg-white/90 px-3.5 py-2.5 text-[14px] outline-none focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20";
export const PRIMARY =
  "btn-navy inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-80";
export const QUIET =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-foreground/15 bg-white/70 px-4 text-[13px] font-medium transition-colors hover:bg-white disabled:opacity-60";


/** A phone number under a name, as a tap-to-call link. */
export function TelLink({ phone }: { phone: string }) {
  if (!phone) return null;
  return (
    <a href={telHref(phone)} dir="ltr" className="mt-0.5 flex items-center gap-1 text-[13px] text-azure">
      <Phone className="size-3" /> {phone}
    </a>
  );
}

/** Call + WhatsApp pills for a phone number. */
export function PhoneActions({ phone }: { phone: string }) {
  if (!phone) return null;
  return (
    <>
      <a href={telHref(phone)} dir="ltr" className="inline-flex items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure">
        <Phone className="size-3.5" /> {phone}
      </a>
      <a
        href={waHref(phone)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-[#dcf7ea] px-3 py-1.5 text-[13px] font-medium text-[#12a26a]"
      >
        <MessageCircle className="size-3.5" /> WhatsApp
      </a>
    </>
  );
}

/** "Fresh" / "Residue" badge. */
export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const fresh = category === "fresh";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        fresh ? "bg-[#dcf7ea] text-[#12a26a]" : "bg-[#efe9ff] text-violet",
        className,
      )}
    >
      {fresh ? "Fresh" : "Residue"}
    </span>
  );
}

const LOT_STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: "Open", tone: "bg-[#e6edff] text-azure" },
  sold: { label: "Sold", tone: "bg-[#dcf7ea] text-[#12a26a]" },
  withdrawn: { label: "Withdrawn", tone: "bg-foreground/10 text-muted-foreground" },
};

/** Open / Sold / Withdrawn pill. */
export function LotStatusPill({ status }: { status: string }) {
  const s = LOT_STATUS[status] ?? { label: status, tone: "bg-foreground/10 text-muted-foreground" };
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium", s.tone)}>{s.label}</span>;
}

/** A row of filter chips. */
export function Chips<T extends string | null>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value ?? "all"}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === o.value ? "border-transparent bg-primary text-primary-foreground" : "border-foreground/15 bg-white/70 hover:border-azure/50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A small photo from a storage URL (not through the image optimizer: Convex URLs are not configured there). */
export function Thumb({ url, alt, className }: { url?: string; alt: string; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#e6edff,#efe9ff)]", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : null}
    </span>
  );
}

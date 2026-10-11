"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { motion } from "motion/react";
import { BadgeCheck, CircleCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { interestMessages } from "@/components/marketplace/interest-messages";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { formatKg } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

// Interest requests on lots BiorefMind sells for partner farms.
// Design: docs/superpowers/specs/2026-10-11-fresh-managed-admin-design.md (section 4)

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

const FIELD = "h-11 rounded-xl border-foreground/10 bg-white/90 px-3.5 text-[15px] focus-visible:border-azure/60 focus-visible:ring-azure/20";

/** "BiorefMind partner farm #N" with a small verified mark, or the seller's own name. */
export function SellerName({ lot, className }: { lot: { managed: boolean; partnerNo?: number; sellerName: string }; className?: string }) {
  const t = useMessages(interestMessages);
  if (!lot.managed) return <span dir="auto" className={cn("truncate", className)}>{lot.sellerName}</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className="truncate">{lot.partnerNo ? fill(t.partner, { n: lot.partnerNo }) : t.partnerShort}</span>
      <BadgeCheck className="size-3.5 shrink-0 text-azure" strokeWidth={2} aria-hidden />
    </span>
  );
}

/** The small "Fresh" badge on fresh-produce lots. */
export function FreshBadge({ className }: { className?: string }) {
  const t = useMessages(interestMessages);
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full bg-[#dcf7ea] px-2.5 py-0.5 text-[12px] font-semibold text-[#0f7a52]", className)}>
      {t.fresh}
    </span>
  );
}

/**
 * Name, phone and a few optional details → `inquiries.send`. No sign-in needed; BiorefMind calls back.
 * `website` is a honeypot people never see.
 */
export function InterestForm({
  lot,
  lotName,
  defaultCompany = "",
  stacked = false,
  onCancel,
  className,
}: {
  lot: { listingId: Id<"listings">; remainingKg: number };
  lotName: string;
  defaultCompany?: string;
  /** One field per row (narrow places such as a dashboard card). */
  stacked?: boolean;
  onCancel?: () => void;
  className?: string;
}) {
  const t = useMessages(interestMessages);
  const locale = useLocale();
  const send = useMutation(api.inquiries.send);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState(defaultCompany);
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const left = formatKg(lot.remainingKg, locale);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const q = quantity.trim() === "" ? undefined : Number(quantity.replace(",", "."));
    if (q !== undefined && Number.isFinite(q) && q > lot.remainingKg) {
      setError(fill(t.tooMuch, { kg: left }));
      return;
    }
    setBusy(true);
    try {
      await send({
        listingId: lot.listingId,
        name,
        phone,
        company: company.trim() || undefined,
        quantityKg: q, // NaN or a fraction is refused by the backend in plain words
        message: message.trim() || undefined,
        website,
      });
      setDone(true);
    } catch (err) {
      setError(localizeBackendError(errorMessage(err), locale));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        role="status"
        className={cn("flex items-start gap-3 rounded-2xl border border-[#bfe9d4] bg-[#e9f9f1] p-4 text-[14px] leading-relaxed", className)}
      >
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-[#12a26a]" strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{t.thanksTitle}</p>
          <p className="mt-0.5 text-foreground/80">{t.thanks}</p>
          <p className="mt-1 truncate font-medium" dir="auto">{lotName}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      noValidate
      className={cn("relative space-y-3 rounded-2xl bg-[#eef2ff] p-3.5 text-start sm:p-4", className)}
    >
      <p className="text-[15px] font-semibold">{t.title}</p>
      <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-2.5", !stacked && "sm:grid-cols-[repeat(2,minmax(0,1fr))]")}>
        <label className="block text-[13px] font-medium">
          {t.name} *
          <Input required autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={cn(FIELD, "mt-1")} />
        </label>
        <label className="block text-[13px] font-medium">
          {t.phone} *
          <Input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            maxLength={30}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0550 12 34 56"
            className={cn(FIELD, "mt-1 rtl:text-end")}
          />
        </label>
        <label className="block text-[13px] font-medium">
          {t.company}
          <Input autoComplete="organization" maxLength={80} value={company} onChange={(e) => setCompany(e.target.value)} className={cn(FIELD, "mt-1")} />
        </label>
        <label className="block text-[13px] font-medium">
          {t.quantity}
          <Input
            inputMode="numeric"
            dir="ltr"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={fill(t.quantityHint, { kg: left })}
            className={cn(FIELD, "mt-1 rtl:text-end")}
          />
        </label>
      </div>
      <label className="block text-[13px] font-medium">
        {t.message}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={t.messagePlaceholder}
          className="mt-1 w-full resize-none rounded-xl border border-foreground/10 bg-white/90 px-3.5 py-2.5 text-[15px] font-normal outline-none focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20"
        />
      </label>
      {/* Honeypot: hidden from people and screen readers, so only bots fill it. */}
      <div aria-hidden className="pointer-events-none absolute start-0 top-0 size-px overflow-hidden whitespace-nowrap opacity-0 [clip-path:inset(50%)]">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-[#fde8e8] px-3 py-2 text-[13px] leading-relaxed text-[#a52a2a]">
          {error}
        </p>
      ) : null}
      <p className="text-[12px] text-muted-foreground">{t.privacy}</p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="btn-navy inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold disabled:opacity-80"
        >
          {busy ? <Spinner size="sm" label={null} /> : t.send}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-full border border-foreground/15 bg-white/60 px-4 text-[14px] font-medium transition-colors hover:bg-white"
          >
            {t.cancel}
          </button>
        ) : null}
      </div>
    </motion.form>
  );
}

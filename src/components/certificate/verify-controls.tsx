"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Printer, Search } from "lucide-react";

import { certificateMessages } from "@/components/certificate/certificate-messages";
import { normalizeCode } from "@/components/certificate/format";
import { useMessages } from "@/i18n/provider";
import { cn } from "@/lib/utils";

/** Opens the browser's print dialog ("Save as PDF" keeps a copy). */
export function PrintButton({ className }: { className?: string }) {
  const t = useMessages(certificateMessages);
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "btn-navy inline-flex h-11 items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-semibold transition-[filter] hover:brightness-125",
        className,
      )}
    >
      <Printer className="size-4" strokeWidth={2} />
      {t.print}
    </button>
  );
}

/** A verify code box that goes to /verify/<CODE>. */
export function VerifyForm({ initial = "", className }: { initial?: string; className?: string }) {
  const t = useMessages(certificateMessages);
  const router = useRouter();
  const [code, setCode] = useState(initial);
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = normalizeCode(code);
    if (!clean) {
      setError(true);
      return;
    }
    router.push(`/verify/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", className)}>
      <label htmlFor="verify-code" className="text-[13px] font-semibold uppercase tracking-[0.14em] text-azure">
        {t.codeLabel}
      </label>
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/45" />
          <input
            id="verify-code"
            dir="ltr"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(false);
            }}
            placeholder={t.codePlaceholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            aria-invalid={error || undefined}
            aria-describedby={error ? "verify-code-error" : undefined}
            className="h-12 w-full rounded-full border border-foreground/10 bg-white/90 pl-11 pr-4 font-mono text-[16px] tracking-[0.12em] outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-foreground/40 focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20"
          />
        </div>
        <button
          type="submit"
          className="btn-navy group inline-flex h-12 shrink-0 items-center justify-center gap-2.5 rounded-full px-7 text-[15px] font-semibold transition-[filter] hover:brightness-125"
        >
          {t.check}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" strokeWidth={2.25} />
        </button>
      </div>
      {error ? (
        <p id="verify-code-error" role="alert" className="mt-2 text-[14px] text-destructive">
          {t.codeEmpty}
        </p>
      ) : null}
    </form>
  );
}

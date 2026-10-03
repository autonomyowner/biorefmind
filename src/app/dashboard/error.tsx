"use client";

import Link from "next/link";

import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale } from "@/i18n/provider";
import { errorMessage } from "@/lib/errors";

/** A failed dashboard: the reason in the visitor's language, and a way to try again. */
export default function DashboardError({ error, retry }: { error: Error; retry: () => void }) {
  const locale = useLocale();
  const ar = locale === "ar";
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="max-w-[420px] text-[16px] text-muted-foreground">{localizeBackendError(errorMessage(error), locale)}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => retry()} className="btn-navy h-11 rounded-full px-6 text-[15px] font-semibold">
          {ar ? "حاول مجددًا" : "Try again"}
        </button>
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-foreground/15 bg-white/60 px-6 text-[15px] font-medium">
          {ar ? "الصفحة الرئيسية" : "Home"}
        </Link>
      </div>
    </div>
  );
}

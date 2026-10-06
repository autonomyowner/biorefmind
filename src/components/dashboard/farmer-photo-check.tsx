"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { FlaskConical, RotateCcw, ScanSearch } from "lucide-react";
import { toast } from "sonner";

import { DASH } from "@/components/dashboard/links";
import { useDashHref } from "@/components/dashboard/use-dash-href";
import { PhotoCheckBox } from "@/components/marketplace/photo-check";
import { photoCheckMessages } from "@/components/marketplace/photo-check-messages";
import { Spinner } from "@/components/ui/spinner";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import type { MyListing } from "@/lib/types";

// Design: docs/superpowers/specs/2026-10-06-ai-photo-check-design.md

const LINE = "mt-3 flex items-center gap-2 rounded-2xl border border-violet/15 bg-violet/[0.06] px-3.5 py-2.5 text-[13px] text-[#2e2a6b]";

/** The farmer's own view of a lot's photo check: checking, unavailable (+ Try again), or the full box. */
export function FarmerPhotoCheck({
  listingId,
  check,
  residue,
  canAct,
}: {
  listingId: MyListing["listingId"];
  check: NonNullable<MyListing["photoCheck"]>;
  residue: string;
  canAct: boolean;
}) {
  const t = useMessages(photoCheckMessages);
  const locale = useLocale();
  const href = useDashHref();
  const retry = useMutation(api.photoCheck.retry);
  const [busy, setBusy] = useState(false);

  async function again() {
    setBusy(true);
    try {
      await retry({ listingId });
    } catch (err) {
      toast.error(localizeBackendError(errorMessage(err), locale));
    } finally {
      setBusy(false);
    }
  }

  if (check.status === "pending") {
    return (
      <div className={LINE} role="status">
        <Spinner size="sm" label={null} />
        {t.pending}
      </div>
    );
  }
  if (check.status === "failed") {
    return (
      <div className={LINE}>
        <ScanSearch className="size-4 shrink-0 text-violet" strokeWidth={1.9} />
        <span className="min-w-0 flex-1">{t.failed}</span>
        {canAct ? (
          <button
            type="button"
            onClick={again}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-violet underline-offset-2 hover:underline disabled:opacity-60"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.2} />
            {t.retry}
          </button>
        ) : null}
      </div>
    );
  }
  if (check.status !== "done" || !check.result) return null;
  return (
    <PhotoCheckBox
      check={check.result}
      residue={residue}
      className="mt-3"
      action={
        <Link href={href(`${DASH.labs}?tab=find`)} className="inline-flex items-center gap-1.5 font-semibold text-violet underline-offset-2 hover:underline">
          <FlaskConical className="size-3.5" strokeWidth={2} />
          {t.findLab}
        </Link>
      }
    />
  );
}

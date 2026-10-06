"use client";

import { FadeIn } from "@/components/motion";

/** The top of every dashboard page: title, one muted line, and the page's main button (wraps under on phones). */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <FadeIn className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] sm:text-[32px]">{title}</h1>
        {description ? <p className="mt-1.5 text-[15px] text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </FadeIn>
  );
}

/** Navy pill for a page header's main button. */
export const HEADER_PRIMARY =
  "btn-navy inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-[filter] hover:brightness-110 disabled:opacity-70";

/** Outlined pill for a page header's second button. */
export const HEADER_QUIET =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-foreground/15 bg-white/60 px-5 text-[15px] font-medium transition-colors hover:bg-white";

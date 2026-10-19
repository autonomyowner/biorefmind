"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { assistantMessages } from "@/components/dashboard/assistant/assistant-messages";
import { CardView } from "@/components/dashboard/assistant/cards";
import { Markdown } from "@/components/dashboard/assistant/markdown";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import type { AssistantMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = AssistantMessage["steps"][number];

/** A step chip's words: "Searched open lots · 5". */
function useStepLabel() {
  const t = useMessages(assistantMessages);
  return (s: Step) => {
    if (s.tool.endsWith(":skipped")) return t.steps.skipped;
    const label = (t.steps as Record<string, string>)[s.tool] ?? t.steps.other;
    return s.detail ? `${label} · ${s.detail}` : label;
  };
}

export function UserMessage({ message }: { message: AssistantMessage }) {
  return (
    <div className="flex flex-col items-end gap-2">
      {message.photos.length ? (
        <div className="flex flex-wrap justify-end gap-2">
          {message.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- Convex storage photo sent in the chat
            <img key={p.storageId} src={p.url} alt="" className="size-28 rounded-2xl border border-white object-cover shadow-[0_10px_24px_-18px_rgba(20,30,120,0.6)] sm:size-36" />
          ))}
        </div>
      ) : null}
      {message.text ? (
        <p dir="auto" className="btn-navy max-w-[min(36rem,88%)] whitespace-pre-line rounded-[22px] rounded-ee-md px-4 py-2.5 text-[15px] leading-relaxed">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

export function AssistantAnswer({ message, photos, canAct }: { message: AssistantMessage; photos: { storageId: string; url: string }[]; canAct: boolean }) {
  const t = useMessages(assistantMessages);
  const locale = useLocale();
  const stepLabel = useStepLabel();
  const retry = useMutation(api.assistant.retry);
  const [copied, setCopied] = useState(false);
  const streaming = message.status === "streaming";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      toast.success(t.message.copied);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard refused: nothing to do
    }
  }

  async function again() {
    try {
      await retry({ messageId: message.messageId });
    } catch (err) {
      toast.error(localizeBackendError(errorMessage(err), locale));
    }
  }

  return (
    <div className="flex gap-3">
      <AssistantOrb active={streaming} />
      <div className="min-w-0 flex-1 space-y-3">
        {streaming && !message.text ? (
          <Analyzing steps={message.steps} startedAt={message.createdAt} />
        ) : message.steps.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="steps">
            {message.steps.map((s, i) => (
              <motion.li
                key={i}
                initial={streaming ? { opacity: 0, scale: 0.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
                  s.tool.endsWith(":skipped") ? "bg-foreground/[0.05] text-muted-foreground" : "bg-violet/[0.09] text-[#4a3aa8]",
                )}
              >
                <Check className="size-3" strokeWidth={2.4} />
                {stepLabel(s)}
              </motion.li>
            ))}
          </ul>
        ) : null}

        {message.text ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <Markdown text={message.text} />
            {streaming ? (
              <p className="mt-2 inline-flex items-center gap-2 text-[12.5px] font-medium text-violet" role="status">
                <span className="inline-block h-4 w-[3px] animate-caret rounded-full bg-violet" aria-hidden />
                {t.message.writing}
              </p>
            ) : null}
          </motion.div>
        ) : null}

        {message.status === "failed" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-3.5 py-2.5 text-[14px]">
            <span>{t.message.failed}</span>
            {canAct ? (
              <button type="button" onClick={again} className="inline-flex items-center gap-1.5 font-semibold text-azure hover:underline">
                <RotateCcw className="size-3.5" /> {t.message.retry}
              </button>
            ) : null}
          </div>
        ) : null}

        {message.cards.length ? (
          <div className="space-y-2.5">
            {message.cards.map((c, i) => (
              <CardView key={i} card={c} message={message} index={i} photos={photos} />
            ))}
          </div>
        ) : null}

        {message.status === "done" && message.text ? (
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {t.message.copy}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The assistant's avatar; while it works, a turning azure-violet ring and a soft halo say so. */
function AssistantOrb({ active }: { active: boolean }) {
  return (
    <span className="relative mt-0.5 flex size-8 shrink-0" aria-hidden>
      {active ? (
        <>
          <motion.span
            className="absolute -inset-2.5 rounded-full bg-violet/25 blur-[8px]"
            animate={{ opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute -inset-[6px] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,var(--azure)_120deg,var(--violet)_240deg,transparent_360deg)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </>
      ) : null}
      <span className="orb relative flex size-8 items-center justify-center rounded-full">
        <Sparkles className="size-4" strokeWidth={1.9} />
      </span>
    </span>
  );
}

/** Before the first words arrive: the steps the assistant has really taken, the one it is on, a timer and placeholder lines. */
function Analyzing({ steps, startedAt }: { steps: Step[]; startedAt: number }) {
  const t = useMessages(assistantMessages);
  const stepLabel = useStepLabel();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  // Until the first real step comes back, say what is happening in general terms.
  const current = steps.length ? t.message.composing : seconds < 2 ? t.message.reading : t.message.checking;

  return (
    <div className="glass max-w-md overflow-hidden rounded-[22px] rounded-ss-md" role="status" aria-live="polite" aria-label={`${t.message.analyzing}: ${current}`}>
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <p className="animate-shimmer bg-[linear-gradient(100deg,var(--azure)_0%,var(--violet)_35%,#c9c2ff_50%,var(--violet)_65%,var(--azure)_100%)] bg-[length:200%_100%] bg-clip-text text-[14.5px] font-semibold text-transparent">
          {t.message.analyzing}
        </p>
        <span dir="ltr" className="font-mono text-[11.5px] text-muted-foreground tabular-nums">
          {seconds}s
        </span>
      </div>
      <ul className="space-y-2 px-4 pt-3 pb-3.5 text-[13px]">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-foreground/75">
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-azure to-violet text-white">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
              {stepLabel(s)}
            </motion.li>
          ))}
          <motion.li key={`now-${steps.length}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 font-medium text-foreground">
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-violet/25 border-t-violet motion-safe:animate-spin" />
            {current}…
          </motion.li>
        </AnimatePresence>
      </ul>
      <div className="space-y-2 px-4 pb-4" aria-hidden>
        {["w-11/12", "w-3/4", "w-1/2"].map((w) => (
          <div key={w} className={cn("h-2.5 animate-shimmer rounded-full bg-[linear-gradient(90deg,rgba(123,92,240,0.08)_0%,rgba(63,108,242,0.22)_50%,rgba(123,92,240,0.08)_100%)] bg-[length:200%_100%]", w)} />
        ))}
      </div>
      <div className="h-[3px] animate-shimmer bg-[linear-gradient(90deg,transparent,var(--azure),var(--violet),transparent)] bg-[length:200%_100%]" aria-hidden />
    </div>
  );
}

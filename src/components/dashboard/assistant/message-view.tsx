"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
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
      <span className="orb mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full" aria-hidden>
        <Sparkles className="size-4" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {message.steps.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="steps">
            {message.steps.map((s, i) => (
              <li
                key={i}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
                  s.tool.endsWith(":skipped") ? "bg-foreground/[0.05] text-muted-foreground" : "bg-violet/[0.09] text-[#4a3aa8]",
                )}
              >
                <Check className="size-3" strokeWidth={2.4} />
                {stepLabel(s)}
              </li>
            ))}
          </ul>
        ) : null}

        {message.text ? (
          <Markdown text={message.text} />
        ) : streaming ? (
          <p className="text-[15px] font-medium text-violet" role="status">
            <span className="text-gradient">{t.message.thinking}</span>
          </p>
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

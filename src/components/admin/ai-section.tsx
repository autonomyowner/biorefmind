"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, ScanSearch, ScanText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { CountUp } from "@/components/motion";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

// Design: docs/superpowers/specs/2026-10-06-ai-photo-check-design.md ("Admin AI section"). Admin stays English.

const FIELD =
  "h-10 min-w-0 flex-1 rounded-xl border border-foreground/10 bg-white/90 px-3.5 text-[14px] outline-none focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20";
const BUTTON =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-white/70 px-4 text-[14px] font-medium transition-colors hover:bg-white disabled:opacity-60";
const SOURCE = {
  saved: "Saved here",
  env: "From the server setting (OPENROUTER_API_KEY)",
  none: "No key: AI features are off",
} as const;

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 })}`;

/** OpenRouter key, model, the two feature switches and this month's checks, readings and spend. */
export function AiSection() {
  const s = useQuery(api.ai.settings, {});
  const saveKey = useMutation(api.ai.saveKey);
  const removeKey = useMutation(api.ai.removeKey);
  const update = useMutation(api.ai.update);
  const testKey = useAction(api.ai.testKey);

  const [key, setKey] = useState("");
  const [model, setModel] = useState<string | null>(null); // null = show the saved model
  const [busy, setBusy] = useState<"" | "key" | "remove" | "test" | "model" | "switch" | "reader">("");
  const [armed, setArmed] = useState(false);
  const [test, setTest] = useState<string | null>(null);

  async function run(what: typeof busy, fn: () => Promise<unknown>, ok?: string) {
    setBusy(what);
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function doTest() {
    setBusy("test");
    setTest(null);
    try {
      const r = await testKey({});
      setTest(r.ok ? `Key works · ${usd(r.usageUsd)} used · ${r.limitUsd === null ? "no spending limit" : `limit ${usd(r.limitUsd)}`}` : r.error);
    } catch (err) {
      setTest(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <section id="ai" className="glass mt-5 scroll-mt-24 rounded-[28px] p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-[19px] font-semibold">
        <Sparkles className="size-5 text-violet" /> AI
      </h2>
      <p className="mt-1 text-[14px] text-muted-foreground">
        BiorefMind uses OpenRouter for the photo check on lots, the lab results reader and the assistant. The key never leaves the backend.
      </p>
      {!s ? (
        <Spinner className="flex py-8" />
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            {[
              { label: "Photo checks this month", value: <CountUp value={s.month.done} /> },
              { label: "Failed checks this month", value: <CountUp value={s.month.failed} /> },
              { label: "Lab sheets read this month", value: <CountUp value={s.month.reads} /> },
              { label: "AI spend this month", value: usd(s.month.costUsd) },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-white bg-white/70 p-4">
                <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                <dd className="mt-1 text-[24px] font-semibold tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 rounded-2xl border border-white bg-white/70 p-4">
            <p className="flex flex-wrap items-center gap-2 text-[14px]">
              <KeyRound className="size-4 text-azure" />
              <span className="font-semibold">OpenRouter key</span>
              {s.keyMasked ? (
                <code dir="ltr" className="rounded-md bg-foreground/[0.06] px-2 py-0.5 text-[13px]">
                  {s.keyMasked}
                </code>
              ) : null}
              <span className={cn("text-[13px]", s.keySource === "none" ? "text-destructive" : "text-muted-foreground")}>{SOURCE[s.keySource]}</span>
            </p>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run("key", async () => {
                  await saveKey({ key });
                  setKey("");
                  setTest(null);
                }, "Key saved.");
              }}
            >
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste a new key (sk-or-…)"
                aria-label="New OpenRouter key"
                dir="ltr"
                className={FIELD}
              />
              <button type="submit" disabled={busy !== "" || !key.trim()} className="btn-navy inline-flex h-10 shrink-0 items-center rounded-full px-5 text-[14px] font-semibold disabled:opacity-70">
                {busy === "key" ? "…" : "Save key"}
              </button>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={doTest} disabled={busy !== "" || s.keySource === "none"} className={BUTTON}>
                {busy === "test" ? "Testing…" : "Test key"}
              </button>
              {s.keySource === "saved" ? (
                <button
                  type="button"
                  onBlur={() => setArmed(false)}
                  disabled={busy !== ""}
                  onClick={() => {
                    if (!armed) return setArmed(true);
                    setArmed(false);
                    void run("remove", async () => {
                      await removeKey({});
                      setTest(null);
                    }, "Saved key removed.");
                  }}
                  className={cn(BUTTON, armed ? "border-transparent bg-destructive text-white hover:bg-destructive" : "border-destructive/30 text-destructive hover:bg-destructive/5")}
                >
                  {armed ? "Confirm: remove key" : "Remove saved key"}
                </button>
              ) : null}
              {test ? (
                <p role="status" className="text-[13px] text-muted-foreground">
                  {test}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <form
              className="rounded-2xl border border-white bg-white/70 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (model === null) return;
                void run("model", async () => {
                  await update({ model });
                  setModel(null);
                }, "Model saved.");
              }}
            >
              <label htmlFor="ai-model" className="text-[14px] font-semibold">
                Model
              </label>
              <p className="text-[13px] text-muted-foreground">Any OpenRouter model that reads images, written as provider/model.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input id="ai-model" dir="ltr" value={model ?? s.model} onChange={(e) => setModel(e.target.value)} className={FIELD} />
                <button type="submit" disabled={busy !== "" || model === null || model.trim() === s.model} className={BUTTON}>
                  {busy === "model" ? "…" : "Save"}
                </button>
              </div>
            </form>
            <div className="divide-y divide-foreground/[0.07] rounded-2xl border border-white bg-white/70 px-4">
              <div className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="flex items-center gap-2 text-[14px] font-semibold">
                    <ScanSearch className="size-4 text-violet" /> Photo check on new lots
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    About $0.003–0.006 per lot. At most 300 a day, 20 per farm. Off: new lots get no check.
                  </p>
                </div>
                <Switch
                  className="mt-1"
                  checked={s.photoCheck}
                  disabled={busy !== ""}
                  aria-label="Photo check on new lots"
                  onCheckedChange={(on) => void run("switch", () => update({ photoCheck: on }), on ? "Photo check on." : "Photo check off.")}
                />
              </div>
              <div className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="flex items-center gap-2 text-[14px] font-semibold">
                    <ScanText className="size-4 text-violet" /> Lab results reader
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Labs photograph their sheet and the form fills in. About $0.005–0.02 a sheet, 30 a day per lab.
                  </p>
                </div>
                <Switch
                  className="mt-1"
                  checked={s.resultsReader}
                  disabled={busy !== ""}
                  aria-label="Lab results reader"
                  onCheckedChange={(on) => void run("reader", () => update({ resultsReader: on }), on ? "Results reader on." : "Results reader off.")}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

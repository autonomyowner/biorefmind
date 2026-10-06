"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Clock, Info, MapPin, Truck, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDashboard } from "@/components/dashboard/shell";
import { fill } from "@/components/dashboard/messages";
import { useMyListings } from "@/components/dashboard/market";
import { labtestsMessages } from "@/components/dashboard/labtests/labtests-messages";
import {
  AREA,
  FIELD,
  PRIMARY,
  QUIET,
  daysText,
  inputToMs,
  todayInput,
  useFail,
  useGuestToast,
  useLabFormat,
} from "@/components/dashboard/labtests/shared";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { RESIDUE_KEYS, catalogLabels, labelOf, residueLabel } from "@/lib/catalog-labels";
import { formatKg } from "@/lib/pricing";
import type { DirectoryLab, Sale } from "@/lib/types";
import { cn } from "@/lib/utils";

// Design: docs/superpowers/specs/2026-10-06-lab-requests-design.md ("Client side")

type SampleState = "fresh" | "dried" | "frozen";
const STATES: SampleState[] = ["fresh", "dried", "frozen"];

/** A factory's purchases (the lots a request can be about). None in the guest preview. */
export function useMySales(): Sale[] | undefined {
  const { workspace, guest } = useDashboard();
  const live = useQuery(api.market.mySales, guest || workspace.kind !== "factory" ? "skip" : { companyId: workspace.companyId });
  return guest ? [] : live;
}

/** The request dialog for one lab; `lab = null` closes it. */
/** Analyses (and the farm's own lot) to start with, e.g. from an assistant card. */
export type RequestPreset = { analyses: string[]; listingId?: string };

export function RequestDialog({ lab, onClose, preset }: { lab: DirectoryLab | null; onClose: () => void; preset?: RequestPreset }) {
  // Keep the last lab while the dialog animates closed.
  const [shown, setShown] = useState<DirectoryLab | null>(lab);
  if (lab && lab !== shown) setShown(lab);
  return (
    <Dialog open={lab !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-[28px] border border-white/80 bg-[#eef4fa] p-0 ring-0 sm:max-w-[680px]"
      >
        {shown ? <RequestForm key={shown.companyId} lab={shown} onDone={onClose} preset={preset} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function RequestForm({ lab, onDone, preset }: { lab: DirectoryLab; onDone: () => void; preset?: RequestPreset }) {
  const { workspace, guest } = useDashboard();
  const t = useMessages(labtestsMessages);
  const labels = useMessages(catalogLabels);
  const locale = useLocale();
  const f = useLabFormat();
  const fail = useFail();
  const guestToast = useGuestToast();
  const send = useMutation(api.labwork.request);
  const listings = useMyListings();
  const sales = useMySales();
  const isFarm = workspace.kind === "farm";
  const openLots = isFarm ? (listings ?? []).filter((l) => l.status === "open") : [];
  const purchases = isFarm ? [] : (sales ?? []);
  const prices = lab.prices ?? [];

  const [chosen, setChosen] = useState<string[]>(() => (preset?.analyses ?? []).filter((a) => prices.some((p) => p.analysis === a)));
  const [about, setAbout] = useState(""); // listingId or saleId; "" = no lot
  const [residue, setResidue] = useState<string | null>(null);
  const [custom, setCustom] = useState(""); // typed residue; wins over the chips
  const [label, setLabel] = useState("");
  const [state, setState] = useState<SampleState | null>(null);
  const [collected, setCollected] = useState(todayInput);
  const [region, setRegion] = useState(workspace.region);
  const [grams, setGrams] = useState("");
  const [packaging, setPackaging] = useState("");
  const [notes, setNotes] = useState("");
  const [delivery, setDelivery] = useState<"dropoff" | "courier">("dropoff");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  const picked = prices.filter((p) => chosen.includes(p.analysis));
  const total = picked.reduce((sum, p) => sum + p.priceDzd, 0);
  const longest = picked.length ? Math.max(...picked.map((p) => p.days)) : 0;

  function toggle(analysis: string) {
    setChosen((c) => (c.includes(analysis) ? c.filter((a) => a !== analysis) : [...c, analysis]));
  }

  /** Picking a lot fills in what it is and where it comes from. */
  function pickAbout(id: string) {
    setAbout(id);
    const lot = openLots.find((l) => l.listingId === id);
    const sale = purchases.find((s) => s.saleId === id);
    const source = lot ?? (sale ? { ...sale, region: sale.otherRegion } : null);
    if (!source) return;
    if (source.residue === "other") {
      setResidue(null);
      setCustom(source.residueName ?? "");
    } else {
      setResidue(source.residue);
      setCustom("");
    }
    if (source.region) setRegion(source.region);
  }

  // A preset lot (assistant card) is picked once the farm's lots have loaded.
  const presetDone = useRef(false);
  useEffect(() => {
    if (presetDone.current || !preset?.listingId || !openLots.some((l) => l.listingId === preset.listingId)) return;
    presetDone.current = true;
    pickAbout(preset.listingId);
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (guest) {
      guestToast();
      return;
    }
    setBusy(true);
    try {
      const lot = openLots.find((l) => l.listingId === about);
      const sale = purchases.find((s) => s.saleId === about);
      await send({
        clientId: workspace.companyId,
        labId: lab.companyId,
        analyses: chosen,
        ...(lot ? { listingId: lot.listingId } : {}),
        ...(sale ? { saleId: sale.saleId } : {}),
        sample: {
          ...(custom.trim() ? { residue: "other", residueName: custom } : { residue: residue ?? "" }),
          label,
          state: state ?? "",
          collectedAt: inputToMs(collected),
          region,
          grams: grams.trim() === "" ? Number.NaN : Number(grams.replace(",", ".")),
          ...(packaging.trim() ? { packaging } : {}),
          ...(notes.trim() ? { notes } : {}),
        },
        delivery,
        ...(delivery === "courier" && tracking.trim() ? { tracking } : {}),
      });
      toast.success(t.dialog.sent);
      onDone();
      // Bring the new request into view.
      document.getElementById("labtests")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  const sectionTitle = "mb-2 text-[14px] font-semibold";

  return (
    <form onSubmit={submit}>
      <div className="flex items-start justify-between gap-3 border-b border-white/80 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <DialogTitle className="text-[20px] font-semibold tracking-[-0.015em]">{t.dialog.title}</DialogTitle>
          <DialogDescription className="mt-1 truncate text-[14px]">{fill(t.dialog.subtitle, { lab: lab.name })}</DialogDescription>
        </div>
        <DialogClose
          aria-label={t.dialog.cancel}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-foreground/70 transition-colors hover:bg-white"
        >
          <X className="size-4" />
        </DialogClose>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-7">
        {/* Analyses */}
        <fieldset>
          <legend className={sectionTitle}>{t.dialog.analyses}</legend>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {prices.map((p) => {
              const on = chosen.includes(p.analysis);
              return (
                <li key={p.analysis}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(p.analysis)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
                      on ? "border-azure/50 bg-white shadow-[0_8px_20px_-16px_rgba(63,108,242,0.9)]" : "border-foreground/10 bg-white/60 hover:border-azure/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                        on ? "border-transparent bg-azure text-white" : "border-foreground/25 bg-white",
                      )}
                    >
                      {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{labelOf(labels.analyses, p.analysis)}</span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">
                        <bdi className="font-semibold text-foreground">{f.dzd(p.priceDzd)}</bdi> · {daysText(t, p.days)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-[#e6edff] px-4 py-2.5 text-[14px]">
            <p className="font-semibold">{fill(t.dialog.total, { total: f.dzd(total) })}</p>
            {longest ? (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-4" /> {fill(t.dialog.resultsIn, { days: daysText(t, longest) })}
              </p>
            ) : (
              <p className="text-muted-foreground">{t.dialog.chooseAnalyses}</p>
            )}
          </div>
        </fieldset>

        {/* About */}
        <label className="block">
          <span className={cn(sectionTitle, "block")}>{t.dialog.about}</span>
          <select value={about} onChange={(e) => pickAbout(e.target.value)} className={cn(FIELD, "w-full border outline-none")}>
            <option value="">{isFarm ? t.dialog.noLot : t.dialog.noLotFactory}</option>
            {openLots.map((l) => (
              <option key={l.listingId} value={l.listingId}>
                {fill(t.dialog.lotOption, { residue: residueLabel(labels.residues, l), kg: formatKg(l.remainingKg, locale), region: l.region })}
              </option>
            ))}
            {purchases.map((s) => (
              <option key={s.saleId} value={s.saleId}>
                {fill(t.dialog.saleOption, { residue: residueLabel(labels.residues, s), kg: formatKg(s.quantityKg, locale), name: s.otherName })}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-[13px] text-muted-foreground">{isFarm ? t.dialog.aboutHintFarm : t.dialog.aboutHintFactory}</span>
        </label>

        {/* Sample */}
        <fieldset className="space-y-4">
          <legend className={sectionTitle}>{t.dialog.sample}</legend>
          <div>
            <p className="mb-2 text-[14px] font-medium">{t.dialog.residue}</p>
            <div className="flex flex-wrap gap-2">
              {RESIDUE_KEYS.map((k) => {
                const on = !custom.trim() && residue === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setResidue(k);
                      setCustom("");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                      on ? "border-transparent bg-primary text-primary-foreground" : "border-foreground/15 bg-white/70 hover:border-azure/50",
                    )}
                  >
                    {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                    {labelOf(labels.residues, k)}
                  </button>
                );
              })}
            </div>
            <label className="mt-3 block text-[13px] text-muted-foreground">
              {t.dialog.residueOther}
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                maxLength={80}
                placeholder={t.dialog.residueOtherPlaceholder}
                className={cn(FIELD, "mt-1.5 text-foreground")}
              />
            </label>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            <label className="block text-[14px] font-medium">
              {t.dialog.label}
              <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={t.dialog.labelPlaceholder} className={cn(FIELD, "mt-1.5")} />
            </label>
            <div>
              <p className="text-[14px] font-medium">{t.dialog.state}</p>
              <div role="radiogroup" aria-label={t.dialog.state} className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-white/70 p-1">
                {STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={state === s}
                    onClick={() => setState(s)}
                    className={cn(
                      "h-9 rounded-lg text-[14px] font-medium transition-colors",
                      state === s ? "bg-primary text-primary-foreground" : "text-foreground/75 hover:bg-white",
                    )}
                  >
                    {t.dialog.states[s]}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-[14px] font-medium">
              {t.dialog.collected}
              <Input type="date" dir="ltr" value={collected} max={todayInput()} onChange={(e) => setCollected(e.target.value)} className={cn(FIELD, "mt-1.5 rtl:text-end")} />
            </label>
            <label className="block text-[14px] font-medium">
              {t.dialog.region}
              <Input value={region} onChange={(e) => setRegion(e.target.value)} className={cn(FIELD, "mt-1.5")} />
            </label>
            <label className="block text-[14px] font-medium">
              {t.dialog.grams}
              <Input inputMode="numeric" dir="ltr" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="1000" className={cn(FIELD, "mt-1.5 rtl:text-end")} />
            </label>
            <label className="block text-[14px] font-medium">
              {t.dialog.packaging}
              <Input value={packaging} onChange={(e) => setPackaging(e.target.value)} maxLength={80} placeholder={t.dialog.packagingPlaceholder} className={cn(FIELD, "mt-1.5")} />
            </label>
          </div>
          <label className="block text-[14px] font-medium">
            {t.dialog.notes}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder={t.dialog.notesPlaceholder} className={cn(AREA, "mt-1.5")} />
          </label>
          <p className="flex items-start gap-2.5 rounded-xl border border-violet/20 bg-[#f3efff] px-4 py-3 text-[14px] leading-relaxed text-[#3b2f7a]">
            <Info className="mt-0.5 size-4 shrink-0 text-violet" /> {t.dialog.guidance}
          </p>
        </fieldset>

        {/* Delivery */}
        <fieldset>
          <legend className={sectionTitle}>{t.dialog.delivery}</legend>
          <div role="radiogroup" aria-label={t.dialog.delivery} className="space-y-2">
            {(["dropoff", "courier"] as const).map((d) => {
              const on = delivery === d;
              const Icon = d === "dropoff" ? MapPin : Truck;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDelivery(d)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start text-[14px] transition-colors",
                    on ? "border-azure/50 bg-white font-medium" : "border-foreground/10 bg-white/60 hover:border-azure/40",
                  )}
                >
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", on ? "border-azure" : "border-foreground/25")}>
                    {on ? <span className="size-2.5 rounded-full bg-azure" /> : null}
                  </span>
                  <Icon className="size-4 shrink-0 text-azure" />
                  <span className="min-w-0">{d === "dropoff" ? t.dialog.dropoff : t.dialog.courier}</span>
                </button>
              );
            })}
          </div>
          {delivery === "dropoff" ? (
            <div className="mt-2.5 rounded-xl bg-white/60 px-4 py-3 text-[14px] leading-relaxed">
              {lab.address ? <p className="font-medium [unicode-bidi:plaintext]">{lab.address}</p> : <p className="text-muted-foreground">{t.dialog.noAddress}</p>}
              {lab.hours ? <p className="mt-0.5 text-muted-foreground">{lab.hours}</p> : null}
            </div>
          ) : (
            <label className="mt-2.5 block text-[14px] font-medium">
              {t.dialog.tracking}
              <Input dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={60} className={cn(FIELD, "mt-1.5 rtl:text-end")} />
            </label>
          )}
        </fieldset>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/80 bg-[#eef4fa]/95 px-5 py-4 backdrop-blur sm:px-7">
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Wallet className="size-4 text-azure" /> {t.dialog.payNote}
        </p>
        <div className="flex gap-2">
          <DialogClose type="button" className={QUIET}>
            {t.dialog.cancel}
          </DialogClose>
          <button type="submit" disabled={busy || chosen.length === 0} className={cn(PRIMARY, "disabled:cursor-not-allowed")}>
            {busy ? <Spinner size="sm" label={null} /> : t.dialog.submit}
          </button>
        </div>
      </div>
    </form>
  );
}

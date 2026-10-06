"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { PauseCircle } from "lucide-react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useDashboard } from "@/components/dashboard/shell";
import { DASH } from "@/components/dashboard/links";
import { useDashHref } from "@/components/dashboard/use-dash-href";
import { Panel } from "@/components/dashboard/profile-card";
import { fill } from "@/components/dashboard/messages";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { num } from "@/components/dashboard/lab/lab-logic";
import { Chip, Field, FIELD, PRIMARY, useFail, useFormat, useGuestBlock, useLabRole } from "@/components/dashboard/lab/ui";
import { useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { ANALYSIS_KEYS, catalogLabels, labelOf } from "@/lib/catalog-labels";
import { cn } from "@/lib/utils";

/** Typical prices in Algerian labs (lab-operations expert, 2026-10-06), shown as placeholders only. */
const TYPICAL_DZD: Record<string, number> = {
  moisture: 1500,
  polyphenols: 4000,
  punicalagin: 12000,
  pectin: 4000,
  mold: 3000,
  oxidation: 2500,
  heavy_metals: 8000,
  mycotoxins: 12000,
  pesticides: 35000,
};
/** Usual turnaround in working days, as placeholders. */
const TYPICAL_DAYS: Record<string, number> = {
  moisture: 2,
  polyphenols: 5,
  punicalagin: 7,
  pectin: 7,
  mold: 5,
  oxidation: 3,
  heavy_metals: 10,
  mycotoxins: 10,
  pesticides: 15,
};

/** Price list (DA per sample + working days) for each analysis offered, plus address, hours, retention and pause. */
export function LabSettings({ id }: { id?: string }) {
  const { workspace } = useDashboard();
  const t = useMessages(labMessages);
  const labels = useMessages(catalogLabels);
  const f = useFormat();
  const fail = useFail();
  const blocked = useGuestBlock();
  const { canManage } = useLabRole();
  const update = useMutation(api.labs.updateSettings);
  const href = useDashHref();

  // Catalog order; legacy "contamination" already reads as heavy metals (companies.mine).
  const services = ANALYSIS_KEYS.filter((k) => workspace.services?.includes(k));
  const [prices, setPrices] = useState<Record<string, { price: string; days: string }>>(() =>
    Object.fromEntries(
      services.map((k) => {
        const p = workspace.prices?.find((x) => x.analysis === k);
        return [k, { price: p ? String(p.priceDzd) : "", days: p ? String(p.days) : "" }];
      }),
    ),
  );
  const [address, setAddress] = useState(workspace.address ?? "");
  const [hours, setHours] = useState(workspace.hours ?? "");
  const [retention, setRetention] = useState(workspace.retention ?? "");
  const [paused, setPaused] = useState(workspace.paused ?? false);
  const [busy, setBusy] = useState(false);
  const disabled = !canManage || busy;

  const setRow = (k: string, patch: Partial<{ price: string; days: string }>) =>
    setPrices((all) => ({ ...all, [k]: { ...(all[k] ?? { price: "", days: "" }), ...patch } }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (blocked()) return;
    setBusy(true);
    try {
      await update({
        companyId: workspace.companyId,
        address,
        hours,
        retention,
        paused,
        // Empty rows are left out: the lab does not take requests for those analyses.
        prices: services.flatMap((k) => {
          const row = prices[k];
          if (!row || (!row.price.trim() && !row.days.trim())) return [];
          return [{ analysis: k, priceDzd: num(row.price), days: num(row.days) }];
        }),
      });
      toast.success(t.settings.saved);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel id={id} title={t.settings.title} action={workspace.paused ? <Chip tone="amber">{t.settings.paused}</Chip> : null}>
      <form onSubmit={save} className="space-y-5">
        <div>
          <p className="-mt-2 mb-3 text-[14px] text-muted-foreground">{t.settings.intro}</p>
          {services.length === 0 ? (
            <p className="rounded-xl bg-white/60 px-3 py-2.5 text-[14px] text-muted-foreground">
              <Link href={href(DASH.settings)} className="underline underline-offset-4">
                {t.settings.noServices}
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {services.map((k) => (
                <li
                  key={k}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 rounded-2xl border border-white bg-white/60 p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)]"
                >
                  <div className="col-span-2 min-w-0 self-center sm:col-span-1">
                    <p className="truncate text-[15px] font-semibold">{labelOf(labels.analyses, k)}</p>
                    <p className="text-[12px] text-muted-foreground">{fill(t.settings.typical, { price: f.dzd(TYPICAL_DZD[k] ?? 0) })}</p>
                  </div>
                  <Field label={t.settings.price}>
                    <input
                      inputMode="numeric"
                      dir="ltr"
                      disabled={disabled}
                      value={prices[k]?.price ?? ""}
                      onChange={(e) => setRow(k, { price: e.target.value })}
                      placeholder={TYPICAL_DZD[k] ? String(TYPICAL_DZD[k]) : ""}
                      className={cn(FIELD, "rtl:text-end")}
                    />
                  </Field>
                  <Field label={t.settings.days}>
                    <input
                      inputMode="numeric"
                      dir="ltr"
                      disabled={disabled}
                      value={prices[k]?.days ?? ""}
                      onChange={(e) => setRow(k, { days: e.target.value })}
                      placeholder={String(TYPICAL_DAYS[k] ?? 5)}
                      className={cn(FIELD, "rtl:text-end")}
                    />
                  </Field>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2.5 text-[13px] font-medium text-azure">{t.settings.clientsPay}</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
          <Field label={t.settings.address} className="sm:col-span-2">
            <input disabled={disabled} value={address} maxLength={200} onChange={(e) => setAddress(e.target.value)} placeholder={t.settings.addressPlaceholder} dir="auto" className={FIELD} />
          </Field>
          <Field label={t.settings.hours}>
            <input disabled={disabled} value={hours} maxLength={120} onChange={(e) => setHours(e.target.value)} placeholder={t.settings.hoursPlaceholder} dir="auto" className={FIELD} />
          </Field>
          <Field label={t.settings.retention}>
            <input disabled={disabled} value={retention} maxLength={80} onChange={(e) => setRetention(e.target.value)} placeholder={t.settings.retentionPlaceholder} dir="auto" className={FIELD} />
          </Field>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-white bg-white/60 p-3.5">
          <PauseCircle className="mt-0.5 size-5 shrink-0 text-violet" strokeWidth={1.8} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{t.settings.pause}</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">{t.settings.pauseHint}</span>
          </span>
          <Switch className="mt-1" checked={paused} disabled={disabled} onCheckedChange={(v) => setPaused(v)} />
        </label>

        {canManage ? (
          <button type="submit" disabled={busy} className={PRIMARY}>
            {busy ? <Spinner size="sm" label={null} /> : t.settings.save}
          </button>
        ) : (
          <p className="text-[13px] text-muted-foreground">{t.settings.readOnly}</p>
        )}
      </form>
    </Panel>
  );
}

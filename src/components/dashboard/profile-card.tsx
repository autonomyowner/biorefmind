"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Check, MapPin, Pencil, Phone } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDashboard } from "@/components/dashboard/shell";
import { dashboardMessages } from "@/components/dashboard/messages";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { ANALYSIS_KEYS, RESIDUE_KEYS, catalogLabels, labelOf } from "@/lib/catalog-labels";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

/** A frosted section card with an optional title row. */
export function Panel({
  id,
  title,
  action,
  children,
  className,
}: {
  id?: string;
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("glass scroll-mt-24 rounded-[28px] p-5 sm:p-7", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-semibold tracking-[-0.015em]">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Chips for catalog keys (analyses or residues). */
export function KeyChips({ keys, names, empty }: { keys: string[]; names: Record<string, string>; empty: string }) {
  if (keys.length === 0) return <p className="text-[14px] text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {keys.map((k) => (
        <li key={k} className="rounded-full bg-[#e6edff] px-3 py-1 text-[13px] font-medium text-azure">
          {labelOf(names, k)}
        </li>
      ))}
    </ul>
  );
}

const FIELD = "h-11 rounded-xl border-foreground/10 bg-white/90 px-3.5 text-[15px] focus-visible:border-azure/60 focus-visible:ring-azure/20";

/** The account's profile as others see it; owners and managers can edit it in place. */
export function ProfileCard({ id, title }: { id?: string; title: string }) {
  const { workspace, guest } = useDashboard();
  const t = useMessages(dashboardMessages);
  const labels = useMessages(catalogLabels);
  const locale = useLocale();
  const update = useMutation(api.companies.updateProfile);
  const canEdit = !guest && workspace.role !== "inspector";

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [region, setRegion] = useState(workspace.region);
  const [phone, setPhone] = useState(workspace.phone);
  const [services, setServices] = useState<string[]>(workspace.services ?? []);
  const [buys, setBuys] = useState<string[]>(workspace.buys ?? []);

  function start() {
    setName(workspace.name);
    setRegion(workspace.region);
    setPhone(workspace.phone);
    setServices(workspace.services ?? []);
    setBuys(workspace.buys ?? []);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await update({
        companyId: workspace.companyId,
        name,
        region,
        phone,
        services: workspace.kind === "lab" ? services : undefined,
        buys: workspace.kind === "factory" ? buys : undefined,
      });
      toast.success(t.profile.saved);
      setEditing(false);
    } catch (err) {
      toast.error(localizeBackendError(errorMessage(err), locale));
    } finally {
      setBusy(false);
    }
  }

  const keysLabel = workspace.kind === "lab" ? t.profile.services : t.profile.buys;
  const keyNames = workspace.kind === "lab" ? labels.analyses : labels.residues;
  const keyValues = workspace.kind === "lab" ? workspace.services ?? [] : workspace.buys ?? [];

  return (
    <Panel
      id={id}
      title={title}
      action={
        canEdit && !editing ? (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-white/60 px-3.5 py-1.5 text-[14px] font-medium transition-colors hover:bg-white"
          >
            <Pencil className="size-3.5" /> {t.profile.edit}
          </button>
        ) : null
      }
    >
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <Input aria-label={t.profile.name} placeholder={t.profile.name} value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <Input aria-label={t.profile.region} placeholder={t.profile.region} value={region} onChange={(e) => setRegion(e.target.value)} className={FIELD} />
            <Input aria-label={t.profile.phone} placeholder={t.profile.phone} type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className={cn(FIELD, "rtl:text-end")} />
          </div>
          {workspace.kind !== "farm" ? (
            <fieldset>
              <legend className="mb-2 text-[14px] font-medium">{keysLabel}</legend>
              <div className="flex flex-wrap gap-2">
                {(workspace.kind === "lab" ? ANALYSIS_KEYS : RESIDUE_KEYS).map((k) => {
                  const list = workspace.kind === "lab" ? services : buys;
                  const set = workspace.kind === "lab" ? setServices : setBuys;
                  const on = list.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set(on ? list.filter((v) => v !== k) : [...list, k])}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                        on ? "border-transparent bg-azure text-white" : "border-foreground/15 bg-white/80 hover:border-azure/50",
                      )}
                    >
                      {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                      {labelOf(keyNames, k)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy} className="btn-navy inline-flex h-10 items-center gap-2 rounded-full px-5 text-[14px] font-semibold disabled:opacity-80">
              {busy ? <Spinner size="sm" label={null} /> : t.profile.save}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="inline-flex h-10 items-center rounded-full border border-foreground/15 bg-white/60 px-5 text-[14px] font-medium">
              {t.profile.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <p className="text-[24px] font-semibold tracking-[-0.02em]">{workspace.name}</p>
          <p className="mt-1 inline-block rounded-full bg-[#e6edff] px-2.5 py-0.5 text-[12px] font-medium text-azure">{t.kinds[workspace.kind]}</p>
          <dl className="mt-4 grid gap-3 text-[15px] sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-azure" />
              <dt className="sr-only">{t.profile.region}</dt>
              <dd>{workspace.region || t.profile.none}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-azure" />
              <dt className="sr-only">{t.profile.phone}</dt>
              <dd dir="ltr">{workspace.phone || t.profile.none}</dd>
            </div>
          </dl>
          {workspace.kind !== "farm" ? (
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-medium text-muted-foreground">{keysLabel}</p>
              <KeyChips keys={keyValues} names={keyNames} empty={t.profile.none} />
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

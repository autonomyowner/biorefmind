"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Clock, FlaskConical, MapPin, Phone, Send } from "lucide-react";

import { useDashboard } from "@/components/dashboard/shell";
import { dashboardMessages } from "@/components/dashboard/messages";
import { KeyChips, Panel } from "@/components/dashboard/profile-card";
import { labtestsMessages } from "@/components/dashboard/labtests/labtests-messages";
import { RequestDialog } from "@/components/dashboard/labtests/request-dialog";
import { PRIMARY, daysText, telHref, useLabFormat } from "@/components/dashboard/labtests/shared";
import { Spinner } from "@/components/ui/spinner";
import { useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { ANALYSIS_KEYS, catalogLabels, labelOf } from "@/lib/catalog-labels";
import type { DirectoryLab } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What the guest preview shows instead of live labs. */
export const SAMPLE_LABS: DirectoryLab[] = [
  {
    companyId: "s1" as DirectoryLab["companyId"],
    name: "Labo Nour",
    region: "Sétif",
    phone: "+213 36 00 00 00",
    services: ["moisture", "polyphenols", "punicalagin", "mold"],
    address: "Cité 1000 logements, Bt 12, Sétif",
    hours: "Sun–Thu 8:00–16:00",
    paused: false,
    prices: [
      { analysis: "moisture", priceDzd: 2_500, days: 2 },
      { analysis: "polyphenols", priceDzd: 6_000, days: 5 },
      { analysis: "punicalagin", priceDzd: 12_000, days: 7 },
      { analysis: "mold", priceDzd: 3_500, days: 4 },
    ],
  },
  {
    companyId: "s2" as DirectoryLab["companyId"],
    name: "BioAnalyse El Eulma",
    region: "El Eulma",
    phone: "+213 36 11 11 11",
    services: ["punicalagin", "oxidation", "heavy_metals"],
    address: "Zone industrielle, El Eulma",
    hours: "Sun–Thu 8:30–15:30",
    paused: true,
    prices: [
      { analysis: "punicalagin", priceDzd: 11_000, days: 6 },
      { analysis: "heavy_metals", priceDzd: 15_000, days: 10 },
    ],
  },
];

/** Listed labs (trial running or paid), filterable by analysis. */
export function LabDirectory({ id, title }: { id?: string; title: string }) {
  const { guest } = useDashboard();
  const t = useMessages(dashboardMessages);
  const labels = useMessages(catalogLabels);
  const [service, setService] = useState<string | null>(null);
  const [asking, setAsking] = useState<DirectoryLab | null>(null);
  const live = useQuery(api.labs.directory, guest ? "skip" : service ? { service } : {}) as DirectoryLab[] | undefined;
  const labs = guest ? SAMPLE_LABS.filter((l) => !service || l.services.includes(service)) : live;

  return (
    <Panel id={id} title={title}>
      <p className="-mt-2 mb-4 text-[14px] text-muted-foreground">{t.directory.body}</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {[null, ...ANALYSIS_KEYS].map((k) => (
          <button
            key={k ?? "all"}
            type="button"
            aria-pressed={service === k}
            onClick={() => setService(k)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              service === k ? "border-transparent bg-primary text-primary-foreground" : "border-foreground/15 bg-white/70 hover:border-azure/50",
            )}
          >
            {k ? labelOf(labels.analyses, k) : t.directory.all}
          </button>
        ))}
      </div>
      {labs === undefined ? (
        <Spinner className="flex py-8" />
      ) : labs.length === 0 ? (
        <p className="rounded-2xl bg-white/50 px-4 py-6 text-center text-[15px] text-muted-foreground">{t.directory.empty}</p>
      ) : (
        // minmax(0, …) so a long lab name truncates instead of widening the page.
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
          {labs.map((lab) => (
            <li key={lab.companyId} className="min-w-0 rounded-2xl border border-white bg-white/70 p-4 shadow-[0_10px_24px_-20px_rgba(20,30,120,0.6)]">
              <div className="flex items-start gap-3">
                <span className="orb flex size-10 shrink-0 items-center justify-center rounded-full">
                  <FlaskConical className="size-[18px]" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold">{lab.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MapPin className="size-3.5" /> {lab.region}
                  </p>
                </div>
                <a
                  href={telHref(lab.phone)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure"
                >
                  <Phone className="size-3.5" /> {t.directory.call}
                </a>
              </div>
              <div className="mt-3">
                <KeyChips keys={lab.services} names={labels.analyses} empty="" />
              </div>
              <p dir="ltr" className="mt-3 text-[13px] text-muted-foreground rtl:text-end">{lab.phone}</p>
              <LabWorkDetails lab={lab} onRequest={() => setAsking(lab)} />
            </li>
          ))}
        </ul>
      )}
      <RequestDialog lab={asking} onClose={() => setAsking(null)} />
    </Panel>
  );
}

/** Where and when to bring a sample, the price list, and the way to ask for an analysis. */
function LabWorkDetails({ lab, onRequest }: { lab: DirectoryLab; onRequest: () => void }) {
  const { workspace } = useDashboard();
  const t = useMessages(labtestsMessages);
  const labels = useMessages(catalogLabels);
  const f = useLabFormat();
  const prices = lab.prices ?? [];
  // Only farm and factory owners/managers can send requests (the backend checks it too).
  const canRequest = (workspace.kind === "farm" || workspace.kind === "factory") && workspace.role !== "inspector";

  return (
    <div className="mt-3 space-y-3 border-t border-foreground/[0.07] pt-3">
      {lab.address || lab.hours ? (
        <div className="space-y-1 text-[13px] text-muted-foreground">
          {lab.address ? (
            <p className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                <span className="sr-only">{t.directory.address}: </span>
                <bdi>{lab.address}</bdi>
              </span>
            </p>
          ) : null}
          {lab.hours ? (
            <p className="flex items-start gap-1.5">
              <Clock className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                <span className="sr-only">{t.directory.hours}: </span>
                {lab.hours}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {prices.length === 0 ? (
        <p className="rounded-xl bg-white/60 px-3 py-2.5 text-[13px] text-muted-foreground">{t.directory.noPrices}</p>
      ) : (
        <>
          <div>
            <p className="mb-1.5 text-[13px] font-medium">{t.directory.prices}</p>
            <ul className="divide-y divide-foreground/[0.06] rounded-xl bg-white/60 px-3 text-[13px]">
              {prices.map((p) => (
                <li key={p.analysis} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
                  <span className="min-w-0 font-medium">{labelOf(labels.analyses, p.analysis)}</span>
                  <span className="text-muted-foreground">
                    <bdi className="font-semibold text-foreground">{f.dzd(p.priceDzd)}</bdi> · {daysText(t, p.days)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {canRequest ? (
            lab.paused ? (
              <button type="button" disabled className={cn(PRIMARY, "w-full cursor-not-allowed opacity-60 disabled:opacity-60")}>
                {t.directory.paused}
              </button>
            ) : (
              <button type="button" onClick={onRequest} className={cn(PRIMARY, "w-full")}>
                <Send className="size-4 rtl:-scale-x-100" /> {t.directory.request}
              </button>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { FlaskConical, MapPin, Phone } from "lucide-react";

import { useDashboard } from "@/components/dashboard/shell";
import { dashboardMessages } from "@/components/dashboard/messages";
import { KeyChips, Panel } from "@/components/dashboard/profile-card";
import { Spinner } from "@/components/ui/spinner";
import { useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { ANALYSIS_KEYS, catalogLabels, labelOf } from "@/lib/catalog-labels";
import type { DirectoryLab } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What the guest preview shows instead of live labs. */
export const SAMPLE_LABS: DirectoryLab[] = [
  { companyId: "s1" as DirectoryLab["companyId"], name: "Labo Nour", region: "Sétif", phone: "+213 36 00 00 00", services: ["moisture", "polyphenols", "mold"] },
  { companyId: "s2" as DirectoryLab["companyId"], name: "BioAnalyse El Eulma", region: "El Eulma", phone: "+213 36 11 11 11", services: ["punicalagin", "oxidation", "contamination"] },
];

/** Listed labs (trial running or paid), filterable by analysis. */
export function LabDirectory({ id, title }: { id?: string; title: string }) {
  const { guest } = useDashboard();
  const t = useMessages(dashboardMessages);
  const labels = useMessages(catalogLabels);
  const [service, setService] = useState<string | null>(null);
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
                  href={`tel:${lab.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure"
                >
                  <Phone className="size-3.5" /> {t.directory.call}
                </a>
              </div>
              <div className="mt-3">
                <KeyChips keys={lab.services} names={labels.analyses} empty="" />
              </div>
              <p dir="ltr" className="mt-3 text-[13px] text-muted-foreground rtl:text-end">{lab.phone}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

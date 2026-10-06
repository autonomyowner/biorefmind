"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { motion } from "motion/react";
import { BadgeCheck, Send } from "lucide-react";
import { toast } from "sonner";

import { CurrencySwitch } from "@/components/currency";
import { LanguageSwitch } from "@/components/language-switch";
import { FadeIn } from "@/components/motion";
import { Spinner } from "@/components/ui/spinner";
import { dashboardMessages } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { Panel, ProfileCard } from "@/components/dashboard/profile-card";
import { useDashboard } from "@/components/dashboard/shell";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { PageHeader } from "./page-header";

const TWO_COLS = "grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]";

/** Settings: profile (public for labs), language and currency; factories also ask for enterprise pricing. */
export function SettingsPage() {
  const { workspace } = useDashboard();
  const t = useMessages(pagesMessages);
  const d = useMessages(dashboardMessages);
  return (
    <>
      <PageHeader title={d.nav.pages.settings} description={t.headers.settings} />
      <div className={TWO_COLS}>
        <FadeIn index={1} className="min-w-0">
          <ProfileCard title={workspace.kind === "lab" ? d.profile.publicTitle : d.profile.title} />
        </FadeIn>
        <FadeIn index={2} className="min-w-0 space-y-5">
          <Panel title={t.settings.preferences}>
            <div className="space-y-5">
              <Preference label={t.settings.language} hint={t.settings.languageHint}>
                <LanguageSwitch className="h-10" />
              </Preference>
              <Preference label={t.settings.currency} hint={t.settings.currencyHint}>
                <CurrencySwitch />
              </Preference>
            </div>
          </Panel>
          {workspace.kind === "factory" ? <EnterpriseCard /> : null}
        </FadeIn>
      </div>
    </>
  );
}

function Preference({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        <p className="text-[13px] text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function EnterpriseCard() {
  const { workspace, guest } = useDashboard();
  const t = useMessages(dashboardMessages);
  const locale = useLocale();
  const send = useMutation(api.enterprise.request);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guest) return;
    setBusy(true);
    try {
      await send({ companyId: workspace.companyId, message });
      toast.success(t.factory.enterpriseThanks);
      setMessage("");
      setSent(true);
    } catch (err) {
      toast.error(localizeBackendError(errorMessage(err), locale));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[28px] bg-[linear-gradient(160deg,#0a1650_0%,#0e2275_55%,#1b1d7a_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(20,30,120,0.9)] sm:p-7">
      <h2 className="text-[19px] font-semibold">{t.factory.enterpriseTitle}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-[#c3cdf2]">{t.factory.enterpriseBody}</p>
      {sent ? (
        <motion.p
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[15px]"
        >
          <BadgeCheck className="size-5 text-[#a9bcff]" /> {t.factory.enterpriseThanks}
        </motion.p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            aria-label={t.factory.enterpriseTitle}
            placeholder={t.factory.enterprisePlaceholder}
            className="w-full resize-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/45 focus-visible:border-[#a9bcff] focus-visible:ring-2 focus-visible:ring-[#a9bcff]/30"
          />
          <button
            type="submit"
            disabled={busy || guest}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#5b7cff] to-violet px-6 text-[15px] font-semibold shadow-[0_14px_30px_-12px_rgba(110,100,255,0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-80 rtl:bg-gradient-to-l"
          >
            {busy ? <Spinner size="sm" label={null} /> : <Send className="size-4 rtl:-scale-x-100" />}
            {t.factory.enterpriseSend}
          </button>
        </form>
      )}
    </section>
  );
}

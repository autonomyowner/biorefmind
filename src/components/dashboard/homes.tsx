"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { BadgeCheck, CalendarClock, EyeOff, Inbox, PackageSearch, Send, Sprout } from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard/shell";
import { dashboardMessages, fill } from "@/components/dashboard/messages";
import { LabDirectory } from "@/components/dashboard/lab-directory";
import { Panel, ProfileCard } from "@/components/dashboard/profile-card";
import { Spinner } from "@/components/ui/spinner";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

/** The right home for the account's type. */
export function DashboardHome() {
  const { workspace } = useDashboard();
  if (workspace.kind === "lab") return <LabHome />;
  if (workspace.kind === "factory") return <FactoryHome />;
  return <FarmHome />;
}

function Greeting() {
  const { viewer, workspace, guest } = useDashboard();
  const t = useMessages(dashboardMessages);
  return (
    <div className="mb-6">
      {guest ? (
        <p className="mb-4 rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 text-[14px] text-[#24366a]">{t.guestBanner}</p>
      ) : null}
      <p className="text-[14px] font-medium text-azure">{t.kinds[workspace.kind]}</p>
      <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">{fill(t.hello, { name: viewer.name })}</h1>
    </div>
  );
}

/** An empty state with an icon, a title and one line. */
function Empty({ icon: Icon, title, body }: { icon: typeof Inbox; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-azure/25 bg-white/40 px-6 py-10 text-center">
      <span className="orb flex size-12 items-center justify-center rounded-full">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <p className="mt-4 text-[17px] font-semibold">{title}</p>
      <p className="mt-1.5 max-w-[420px] text-[14px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

/* ---------- Farmer ---------- */

function FarmHome() {
  const t = useMessages(dashboardMessages);
  return (
    <>
      <Greeting />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel id="listings" title={t.farm.listingsTitle}>
          <Empty icon={Sprout} title={t.farm.listingsEmpty} body={t.farm.listingsBody} />
        </Panel>
        <div className="space-y-5">
          <ProfileCard title={t.profile.title} />
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#1b2f94_0%,#26208a_60%,#3d2bb0_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(40,40,170,0.9)] sm:p-6">
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <BadgeCheck className="size-5 text-[#a9bcff]" /> {t.farm.freeTitle}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/75">{t.farm.freeBody}</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <LabDirectory id="labs" title={t.directory.title} />
      </div>
    </>
  );
}

/* ---------- Lab ---------- */

const DAY = 86_400_000;

function LabHome() {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  const locale = useLocale();
  const [now] = useState(() => Date.now());
  const date = (ms: number) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(ms);

  let status: string;
  if (workspace.plan === "lab_paid" && (workspace.paidUntil ?? 0) > now) status = fill(t.lab.paid, { date: date(workspace.paidUntil!) });
  else if (workspace.plan === "lab_trial" && (workspace.trialEndsAt ?? 0) > now) {
    const days = Math.ceil(((workspace.trialEndsAt ?? now) - now) / DAY);
    status = days <= 1 ? t.lab.trialLastDay : fill(t.lab.trial, { days });
  } else status = t.lab.hidden;

  return (
    <>
      <Greeting />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ProfileCard id="profile" title={t.profile.publicTitle} />
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#1b2f94_0%,#26208a_60%,#3d2bb0_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(40,40,170,0.9)] sm:p-6">
          <p className="text-[13px] text-white/70">{t.lab.planTitle}</p>
          <p className="mt-2 flex items-start gap-2 text-[20px] font-semibold leading-snug">
            {workspace.listed ? <CalendarClock className="mt-1 size-5 shrink-0 text-[#a9bcff]" /> : <EyeOff className="mt-1 size-5 shrink-0 text-[#ffb4a8]" />}
            {status}
          </p>
          <p
            className={cn(
              "mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium",
              workspace.listed ? "bg-[#dcf7ea] text-[#12a26a]" : "bg-white/15 text-white/85",
            )}
          >
            <span className={cn("size-2 rounded-full", workspace.listed ? "bg-[#12a26a]" : "bg-white/60")} />
            {workspace.listed ? t.lab.visible : t.lab.notVisible}
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-white/70">{t.lab.planNote}</p>
        </div>
      </div>
      <div className="mt-5">
        <Panel id="requests" title={t.lab.requestsTitle}>
          <Empty icon={Inbox} title={t.lab.requestsTitle} body={t.lab.requestsEmpty} />
        </Panel>
      </div>
    </>
  );
}

/* ---------- Factory ---------- */

function FactoryHome() {
  const t = useMessages(dashboardMessages);
  return (
    <>
      <Greeting />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel id="browse" title={t.factory.browseTitle}>
          <Empty icon={PackageSearch} title={t.factory.browseEmpty} body={t.factory.browseBody} />
        </Panel>
        <ProfileCard title={t.profile.title} />
      </div>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <LabDirectory id="labs" title={t.directory.titleFactory} />
        <EnterpriseCard />
      </div>
    </>
  );
}

function EnterpriseCard() {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  const locale = useLocale();
  const send = useMutation(api.enterprise.request);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <section
      id="enterprise"
      className="scroll-mt-24 self-start rounded-[28px] bg-[linear-gradient(160deg,#0a1650_0%,#0e2275_55%,#1b1d7a_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(20,30,120,0.9)] sm:p-7"
    >
      <h2 className="text-[19px] font-semibold">{t.factory.enterpriseTitle}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-[#c3cdf2]">{t.factory.enterpriseBody}</p>
      {sent ? (
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[15px]">
          <BadgeCheck className="size-5 text-[#a9bcff]" /> {t.factory.enterpriseThanks}
        </p>
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
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#5b7cff] to-violet px-6 text-[15px] font-semibold shadow-[0_14px_30px_-12px_rgba(110,100,255,0.9)] disabled:opacity-80 rtl:bg-gradient-to-l"
          >
            {busy ? <Spinner size="sm" label={null} /> : <Send className="size-4 rtl:-scale-x-100" />}
            {t.factory.enterpriseSend}
          </button>
        </form>
      )}
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { ArrowRight } from "lucide-react";

import { landingMessages } from "@/components/landing/messages";
import { Reveal } from "@/components/landing/reveal";
import { Headline, SectionBadge } from "@/components/landing/section-badge";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import type { Go } from "@/components/landing/go";
import { MarketBoard } from "@/components/marketplace/market-board";
import { marketplaceMessages, type MarketplaceMessages } from "@/components/marketplace/messages";
import { getMessages } from "@/i18n/server";
import { api } from "@/lib/backend";
import { hasSession } from "@/lib/session";
import type { PublicLot } from "@/lib/types";

// Design: docs/superpowers/specs/2026-10-05-public-marketplace-design.md

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(marketplaceMessages);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: { title: t.metaTitle, description: t.metaDescription, type: "website" },
  };
}

/** The first answer is rendered on the server; if the backend can't be reached, the browser loads it. */
async function firstLots(): Promise<PublicLot[] | null> {
  try {
    return await fetchQuery(api.market.publicLots, {});
  } catch {
    return null;
  }
}

/** Public marketplace: every open lot, for anyone. Contact details stay hidden until a sale. */
export default async function MarketplacePage() {
  const [t, landing, signedIn, initial] = await Promise.all([
    getMessages(marketplaceMessages),
    getMessages(landingMessages),
    hasSession(),
    firstLots(),
  ]);
  const go: Go = signedIn ? { href: "/dashboard", label: landing.account.dashboard } : null;

  return (
    <div className="flex min-h-dvh flex-1 flex-col overflow-x-clip">
      <div className="relative">
        {/* The same soft periwinkle glow as the home page, behind the title. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_45%_60%_at_50%_30%,rgba(120,150,255,0.30),transparent_70%)]"
        />
        <SiteHeader signedIn={signedIn} current="market" />
      </div>

      <main className="relative flex-1">
        <section className="mx-auto max-w-[1280px] px-5 pt-4 pb-20 sm:px-10 sm:pt-8 lg:px-16">
          <Reveal className="mx-auto max-w-[720px] text-center">
            <SectionBadge>{t.badge}</SectionBadge>
            <h1 className="mt-6 text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[60px]">
              <Headline lead={t.titleLead} accent={t.titleAccent} />
            </h1>
            <p className="mx-auto mt-5 max-w-[560px] text-pretty text-[17px] leading-relaxed text-muted-foreground">{t.body}</p>
          </Reveal>

          <div className="mt-10">
            <MarketBoard initial={initial} signedIn={signedIn} />
          </div>
        </section>

        <SellBand t={t.sell} go={go} />
      </main>

      <SiteFooter t={landing.footer} go={go} account={landing.account} />
    </div>
  );
}

/** For farmers who land here: list your own residues. */
function SellBand({ t, go }: { t: MarketplaceMessages["sell"]; go: Go }) {
  return (
    <section className="mx-auto max-w-[1280px] px-5 sm:px-10 lg:px-16">
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#1b2f94_0%,#26208a_60%,#3d2bb0_100%)] px-6 py-12 text-center text-white shadow-[0_30px_60px_-30px_rgba(40,40,170,0.9)] sm:px-12 sm:py-16">
          <span aria-hidden className="absolute -bottom-16 -end-12 size-56 rounded-full border-[18px] border-[#6f7dff]/25" />
          <span aria-hidden className="absolute -top-20 -start-16 size-56 rounded-full border-[18px] border-[#6f7dff]/15" />
          <h2 className="relative text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[44px]">
            <Headline lead={t.titleLead} accent={t.titleAccent} tone="dark" />
          </h2>
          <p className="relative mx-auto mt-4 max-w-[520px] text-[16px] leading-relaxed text-white/75 sm:text-[17px]">{t.body}</p>
          <Link
            href={go ? "/dashboard" : "/signup?as=farm"}
            className="relative mt-8 inline-flex h-14 items-center gap-3 rounded-full bg-white px-8 text-[17px] font-semibold text-primary transition-colors hover:bg-[#e3eef8]"
          >
            {go ? t.signedIn : t.cta}
            <ArrowRight className="size-5 rtl:-scale-x-100" strokeWidth={2.25} />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

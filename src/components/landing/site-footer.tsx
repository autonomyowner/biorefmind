import Link from "next/link";

import { Wordmark } from "@/components/landing/site-header";
import type { Go } from "@/components/landing/go";
import type { LandingMessages } from "@/components/landing/messages";

type T = LandingMessages;

/** The public pages' footer (home, /marketplace, /verify). Links point at the home page's sections. */
export function SiteFooter({ t, go, account }: { t: T["footer"]; go: Go; account: T["account"] }) {
  const columns = [
    {
      title: t.product,
      links: [
        { label: t.market, href: "/marketplace" },
        { label: t.marketplaces, href: "/#marketplaces" },
        { label: t.quality, href: "/#quality" },
        { label: t.how, href: "/#how-it-works" },
        { label: t.pricing, href: "/#pricing" },
      ],
    },
    {
      title: t.account,
      links: go
        ? [{ label: account.footerDashboard, href: "/dashboard" }]
        : [
            { label: t.signIn, href: "/login" },
            { label: t.createAccount, href: "/signup" },
            { label: t.guest, href: "/dashboard?guest=1" },
          ],
    },
    {
      title: t.help,
      links: [
        { label: t.faq, href: "/#faq" },
        { label: t.routes, href: "/#routes" },
        { label: t.verify, href: "/verify" },
      ],
    },
  ];
  // Phones get two short lines: the main links (sign-in is already in the header), then the logo with the copyright.
  // "Check a certificate" stays desktop-only: a fourth link would wrap to a third line at 360 px.
  const phoneLinks = [
    { label: t.market, href: "/marketplace" },
    { label: t.pricing, href: "/#pricing" },
    { label: t.faq, href: "/#faq" },
  ];
  return (
    <footer className="pt-10 pb-8 md:pt-16 md:pb-10">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-10 lg:px-16">
        <div className="md:hidden">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[15px]">
            {phoneLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="transition-opacity hover:opacity-70">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-5">
            <Wordmark className="shrink-0 text-[19px] [&_img]:size-7" />
            <span dir="ltr" className="text-[13px] text-muted-foreground">© 2026</span>
          </div>
        </div>

        <div className="hidden gap-12 md:grid md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-[280px] text-[15px] text-muted-foreground">{t.tagline}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-azure">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-[15px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-opacity hover:opacity-70">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 hidden justify-between gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground md:flex">
          <span>{t.rights}</span>
          <span>{t.madeFor}</span>
        </div>
      </div>
    </footer>
  );
}

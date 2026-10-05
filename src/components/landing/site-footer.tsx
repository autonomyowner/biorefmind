import Link from "next/link";

import { Wordmark } from "@/components/landing/site-header";
import type { Go } from "@/components/landing/go";
import type { LandingMessages } from "@/components/landing/messages";

type T = LandingMessages;

/** The public pages' footer (home and /marketplace). Links point at the home page's sections. */
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
      ],
    },
  ];
  return (
    <footer className="pt-16 pb-10">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-10 lg:px-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
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
        <div className="mt-16 flex flex-col justify-between gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground sm:flex-row">
          <span>{t.rights}</span>
          <span>{t.madeFor}</span>
        </div>
      </div>
    </footer>
  );
}

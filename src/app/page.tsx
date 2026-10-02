import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Factory,
  FlaskConical,
  HandCoins,
  Recycle,
  ShieldCheck,
  Sprout,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/landing/reveal";
import { HowItWorks } from "@/components/landing/how-it-works";
import { QualitySection } from "@/components/landing/quality-section";
import { RoutesSection } from "@/components/landing/routes-section";
import { Headline, SectionBadge } from "@/components/landing/section-badge";
import { SiteHeader, Wordmark } from "@/components/landing/site-header";
import { cn } from "@/lib/utils";
import { landingMessages, type LandingMessages } from "@/components/landing/messages";
import { getLocale, getMessages } from "@/i18n/server";

/** Public landing page: the bio-waste marketplace with the AI quality score as its trust layer. */
export default async function HomePage() {
  const t = await getMessages(landingMessages);
  const locale = await getLocale();
  return (
    <div className="flex min-h-dvh flex-1 flex-col overflow-x-clip">
      <main className="flex-1">
        <Hero t={t.hero} />
        <Residues t={t.residues} />
        <Marketplaces t={t.markets} />
        <QualitySection t={t.quality} />
        <HowItWorks t={t.how} />
        <RoutesSection t={t.routes} locale={locale} />
        <Pricing t={t.pricing} />
        <Faq t={t.faq} />
        <ClosingCta t={t.closing} />
      </main>
      <Footer t={t.footer} />
    </div>
  );
}

type T = LandingMessages;

/* ---------- Shared pieces ---------- */

/** The theme's glowing navy pill, arrow first. */
function CtaButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "btn-navy group inline-flex h-14 items-center gap-3.5 rounded-full ps-7 pe-9 text-[17px] font-semibold transition-[filter] hover:brightness-125 sm:h-[60px] sm:text-[19px]",
        className,
      )}
    >
      <ArrowRight
        className="size-5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
        strokeWidth={2.25}
      />
      {children}
    </Link>
  );
}

/** The quiet outlined pill next to the navy one. */
function GhostButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-14 items-center rounded-full border border-[#9fb4cc] bg-white/25 px-9 text-[17px] font-medium transition-colors hover:bg-white/60 sm:h-[60px] sm:text-[18px]"
    >
      {children}
    </Link>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-balance text-[36px] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[52px]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

const container = "mx-auto max-w-[1280px] px-5 sm:px-10 lg:px-16";

/* ---------- Hero ---------- */

const TRUST_ICONS: LucideIcon[] = [Sprout, Factory, FlaskConical, Recycle];

function Hero({ t }: { t: T["hero"] }) {
  return (
    <section className="relative">
      {/* A soft periwinkle glow behind the emblem. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-0 hidden w-full lg:block bg-[radial-gradient(ellipse_32%_42%_at_62%_48%,rgba(120,150,255,0.38),transparent_70%)] rtl:bg-[radial-gradient(ellipse_32%_42%_at_38%_48%,rgba(120,150,255,0.38),transparent_70%)]"
      />
      <SiteHeader />

      {/* Static on wide screens so the photo anchors to the full-width section, not this box. */}
      <div className="relative mx-auto grid max-w-[1440px] px-5 sm:px-10 lg:static lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-16">
        <div className="relative z-10 flex flex-col pt-6 pb-10 sm:pt-10 lg:justify-center lg:pt-4 lg:pb-16">
          <SectionBadge className="self-start">{t.badge}</SectionBadge>
          <h1 className="mt-6 max-w-[640px] text-balance text-[46px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[68px] lg:text-[76px]">
            <Headline lead={t.titleLead} accent={t.titleAccent} />
          </h1>
          <p className="mt-6 max-w-[520px] text-pretty text-[17px] leading-relaxed text-muted-foreground sm:text-[18px]">
            {t.body}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <CtaButton href="/signup">{t.cta}</CtaButton>
            <GhostButton href="/dashboard?guest=1">{t.secondary}</GhostButton>
          </div>

          <div className="mt-12 flex items-center gap-5 lg:mt-20">
            <ul className="flex" aria-hidden>
              {TRUST_ICONS.map((Icon, i) => (
                <li
                  key={i}
                  className="-ms-3 flex size-12 items-center justify-center rounded-full border-[3px] border-white bg-[#e9f2f9] text-azure shadow-[0_8px_18px_-10px_rgba(7,23,51,0.5)] first:ms-0 sm:size-14"
                >
                  <Icon className="size-5 sm:size-6" strokeWidth={1.6} />
                </li>
              ))}
            </ul>
            <span aria-hidden className="h-10 w-px bg-foreground/25" />
            <p className="text-[15px] text-muted-foreground sm:text-[17px]">
              <strong className="font-semibold text-foreground">{t.trustStrong}</strong> {t.trustRest}
            </p>
          </div>
        </div>

        {/* The robotic hand holding the emblem. On wide screens it bleeds off the page edge. */}
        <div className="relative -me-5 aspect-[1546/1017] sm:-me-10 lg:absolute lg:top-6 lg:bottom-6 lg:end-0 lg:me-0 lg:aspect-auto lg:w-[58%]">
          <Image
            src="/art/hand-emblem.png"
            alt={t.imageAlt}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            loading="eager"
            fetchPriority="high"
            className={cn(
              // Background removed. The arm is cut at the picture's right edge, so that edge
              // sits on the page edge; the wrist's cut at the bottom fades out.
              "object-contain object-[100%_50%] rtl:-scale-x-100 drop-shadow-[0_40px_50px_rgba(40,70,170,0.25)]",
              "[mask-image:linear-gradient(to_bottom,black_86%,transparent)]",
            )}
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- What gets traded: looping strip under the hero ---------- */

function Residues({ t }: { t: T["residues"] }) {
  // Repeat the set so it overflows a wide screen, then render that block twice:
  // the -50% marquee translate lines the second copy up with the first.
  const loop = Array.from({ length: 2 }, () => t.items).flat();
  return (
    <section aria-label={t.label} className="py-12 sm:py-16">
      <p className="text-center text-[13px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t.label}</p>
      {/* Left to right in both languages: in right-to-left the -50% translate
          would pull a gap into view. Each word still reads in its own script. */}
      <div
        dir="ltr"
        className="mx-auto mt-6 max-w-[1280px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
      >
        <ul className="animate-marquee flex w-max items-center">
          {[...loop, ...loop].map((name, i) => (
            <li
              key={`${name}-${i}`}
              dir="auto"
              aria-hidden={i >= t.items.length || undefined}
              className="flex items-center whitespace-nowrap text-[20px] font-medium tracking-[-0.02em] text-foreground/40 sm:text-[24px]"
            >
              {name}
              <span className="mx-8 size-1.5 rounded-full bg-azure/60 sm:mx-12" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Two marketplaces ---------- */

type Point = { title: string; body: string };

const FARM_ICONS: LucideIcon[] = [Sprout, HandCoins, Truck];
const FACTORY_ICONS: LucideIcon[] = [Factory, Recycle, ShieldCheck];

function PointList({ label, points, icons }: { label: string; points: readonly Point[]; icons: LucideIcon[] }) {
  return (
    <div>
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-azure">{label}</p>
      <ul className="mt-8 space-y-10 lg:space-y-12">
        {points.map((p, i) => {
          const Icon = icons[i];
          return (
            <li key={p.title} className="flex gap-5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/55 text-azure shadow-[0_12px_28px_-18px_rgba(7,23,51,0.5)]">
                <Icon className="size-6" strokeWidth={1.6} />
              </span>
              <div className="pt-0.5">
                <h3 className="text-[19px] font-semibold tracking-[-0.015em]">{p.title}</h3>
                <p className="mt-2 max-w-[290px] text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Where the chips sit on the hub's ring, as [left %, top %]: residues in on the
// start side, products out on the end side.
const HUB_IN = [
  [10, 26],
  [3, 50],
  [10, 74],
];
const HUB_OUT = [
  [88, 20],
  [97, 40],
  [97, 60],
  [88, 80],
];

/** The marketplace hub: the hand-and-emblem photo in concentric rings, residues in, products out. */
function Hub({ t }: { t: T["markets"] }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[480px]">
      {/* Still, drawn rings. */}
      <div aria-hidden className="absolute inset-[10%] rounded-full bg-[radial-gradient(closest-side,rgba(110,140,240,0.32),transparent)]" />
      <div aria-hidden className="absolute inset-[2%] rounded-full border border-azure/15" />
      <div aria-hidden className="absolute inset-[14%] rounded-full border border-dashed border-azure/25" />
      {/* The globe with its orbits, background removed. */}
      <Image
        src="/art/globe.png"
        alt={t.hubAlt}
        width={1254}
        height={1254}
        sizes="(min-width: 640px) 420px, 80vw"
        className="absolute inset-[6%] size-[88%] drop-shadow-[0_30px_40px_rgba(63,108,242,0.35)]"
      />
      <p className="btn-navy absolute bottom-[4%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold">
        {t.hubLabel}
      </p>

      {/* Ring chips on wider screens; on phones they sit in two rows below. */}
      {t.hubIn.map((label, i) => (
        <HubChip key={label} label={label} tone="in" pos={HUB_IN[i]} />
      ))}
      {t.hubOut.map((label, i) => (
        <HubChip key={label} label={label} tone="out" pos={HUB_OUT[i]} />
      ))}
    </div>
  );
}

function HubChip({ label, tone, pos }: { label: string; tone: "in" | "out"; pos: number[] }) {
  return (
    <span
      // Positions are physical so the ring reads the same way in both languages.
      style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
      className="absolute hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/80 bg-card/85 px-3.5 py-1.5 text-[13px] font-medium shadow-[0_10px_24px_-14px_rgba(7,23,51,0.5)] backdrop-blur sm:flex"
    >
      <span className={cn("size-2 rounded-full", tone === "in" ? "bg-azure" : "bg-violet")} />
      {label}
    </span>
  );
}

function HubChipsPhone({ t }: { t: T["markets"] }) {
  return (
    <div className="mt-6 space-y-3 sm:hidden">
      {[
        { items: t.hubIn, dot: "bg-azure" },
        { items: t.hubOut, dot: "bg-violet" },
      ].map((row, r) => (
        <ul key={r} className="flex flex-wrap justify-center gap-2">
          {row.items.map((label) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full border border-white/80 bg-card/85 px-3 py-1.5 text-[13px] font-medium"
            >
              <span className={cn("size-2 rounded-full", row.dot)} />
              {label}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function Marketplaces({ t }: { t: T["markets"] }) {
  return (
    <section id="marketplaces" className="relative scroll-mt-6 overflow-hidden py-24 sm:py-28">
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
        <Reveal className="mx-auto max-w-[640px] text-center">
          <SectionBadge>{t.eyebrow}</SectionBadge>
          <SectionTitle className="mt-6">
            <Headline lead={t.titleLead} accent={t.titleAccent} />
          </SectionTitle>
          <p className="mx-auto mt-5 max-w-[470px] text-[17px] leading-relaxed text-muted-foreground">{t.body}</p>
        </Reveal>

        <div className="mt-14 grid gap-14 lg:mt-12 lg:grid-cols-[1fr_minmax(0,1.3fr)_1fr] lg:items-center lg:gap-8">
          <Reveal className="lg:order-1">
            <PointList label={t.farmLabel} points={t.farm} icons={FARM_ICONS} />
          </Reveal>

          <Reveal delay={0.1} className="lg:order-2">
            <Hub t={t} />
            <HubChipsPhone t={t} />
          </Reveal>

          <Reveal delay={0.16} className="lg:order-3">
            <PointList label={t.factoryLabel} points={t.factory} icons={FACTORY_ICONS} />
          </Reveal>
        </div>

        <div className="mt-14 flex justify-center">
          <CtaButton href="/signup">{t.cta}</CtaButton>
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */

// The middle plan is the highlighted one.
const FEATURED_PLAN = 1;

function Pricing({ t }: { t: T["pricing"] }) {
  return (
    <section id="pricing" className="scroll-mt-6 py-24 sm:py-32">
      <div className={container}>
        <Reveal className="max-w-[640px]">
          <SectionBadge>{t.eyebrow}</SectionBadge>
          <SectionTitle className="mt-6">
            <Headline lead={t.titleLead} accent={t.titleAccent} />
          </SectionTitle>
          <p className="mt-5 text-[15px] text-muted-foreground">{t.draft}</p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {t.plans.map((p, i) => {
            const featured = i === FEATURED_PLAN;
            return (
              <Reveal
                key={p.name}
                delay={i * 0.08}
                className={cn(
                  "flex flex-col rounded-[28px] p-7 sm:p-9",
                  featured ? "btn-navy" : "glass",
                )}
              >
                <h3 className="text-[20px] font-semibold">{p.name}</h3>
                <p className={cn("mt-1 text-[15px]", featured ? "text-primary-foreground/65" : "text-muted-foreground")}>
                  {p.lead}
                </p>
                <p className="mt-10 text-[56px] font-semibold leading-none tracking-[-0.04em]">{p.price}</p>
                <p className={cn("mt-2 text-[15px]", featured ? "text-primary-foreground/65" : "text-muted-foreground")}>
                  {p.unit}
                </p>
                <ul className="mt-8 flex-1 space-y-3 text-[15px]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-[#a9bcff]" : "text-azure")} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={cn(
                    "mt-10 flex h-12 items-center justify-center rounded-full text-[16px] font-semibold transition-colors",
                    featured
                      ? "bg-white text-primary hover:bg-[#e3eef8]"
                      : "border border-foreground/25 hover:border-transparent hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  {p.cta}
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

function Faq({ t }: { t: T["faq"] }) {
  return (
    <section id="faq" className="relative scroll-mt-6 py-24 sm:py-32">
      <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20")}>
        <Reveal>
          <SectionBadge>{t.eyebrow}</SectionBadge>
          <SectionTitle className="mt-6">
            <Headline lead={t.titleLead} accent={t.titleAccent} />
          </SectionTitle>
        </Reveal>
        <Reveal delay={0.08}>
          <Accordion className="glass rounded-[28px] px-6 sm:px-8">
            {t.items.map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border-b border-border last:border-0">
                <AccordionTrigger className="py-6 text-[18px] font-medium hover:no-underline sm:text-[19px]">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-[16px] leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Closing call to action ---------- */

function ClosingCta({ t }: { t: T["closing"] }) {
  return (
    <section className="px-5 pb-10 sm:px-10 lg:px-16">
      <div className="relative mx-auto grid max-w-[1280px] overflow-hidden rounded-[32px] border border-white/80 bg-[radial-gradient(ellipse_60%_80%_at_80%_55%,rgba(120,140,255,0.35),transparent_70%),linear-gradient(120deg,#eef3fd_0%,#dde7fa_55%,#cbd6f5_100%)] lg:grid-cols-[1.1fr_1fr]">
        <div className="relative z-10 px-6 pt-16 pb-6 text-center sm:px-12 sm:pt-20 lg:py-24 lg:text-start">
          <h2 className="mx-auto max-w-[560px] text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[58px] lg:mx-0">
            <Headline lead={t.titleLead} accent={t.titleAccent} />
          </h2>
          <p className="mx-auto mt-5 max-w-[440px] text-[17px] text-muted-foreground lg:mx-0">{t.body}</p>
          <div className="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:justify-center lg:justify-start">
            <CtaButton href="/signup">{t.cta}</CtaButton>
            <Link href="/dashboard?guest=1" className="text-[16px] font-medium underline-offset-4 hover:underline">
              {t.guest}
            </Link>
          </div>
        </div>
        <div className="relative h-[clamp(220px,48vw,420px)] lg:h-auto">
          <Image
            src="/art/hand-emblem-2.png"
            alt=""
            fill
            sizes="(min-width: 1024px) 600px, 100vw"
            // Background removed; the arm's cut edges sit in the banner's end-bottom corner. Mirrored in Arabic.
            className="object-contain object-[100%_100%] pt-6 rtl:-scale-x-100 drop-shadow-[0_30px_40px_rgba(40,70,170,0.25)]"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer({ t }: { t: T["footer"] }) {
  const columns = [
    {
      title: t.product,
      links: [
        { label: t.marketplaces, href: "#marketplaces" },
        { label: t.quality, href: "#quality" },
        { label: t.how, href: "#how-it-works" },
        { label: t.pricing, href: "#pricing" },
      ],
    },
    {
      title: t.account,
      links: [
        { label: t.signIn, href: "/login" },
        { label: t.createAccount, href: "/signup" },
        { label: t.guest, href: "/dashboard?guest=1" },
      ],
    },
    {
      title: t.help,
      links: [
        { label: t.faq, href: "#faq" },
        { label: t.routes, href: "#routes" },
      ],
    },
  ];
  return (
    <footer className="pt-16 pb-10">
      <div className={container}>
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

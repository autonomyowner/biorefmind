import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Factory,
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
import { RoutesSection } from "@/components/landing/routes-section";
import { SiteHeader, Wordmark } from "@/components/landing/site-header";
import { cn } from "@/lib/utils";
import { landingMessages, type LandingMessages } from "@/components/landing/messages";
import { getMessages } from "@/i18n/server";

/** Public landing page: the bio-waste marketplace with the quality score as its trust layer. */
export default async function HomePage() {
  const t = await getMessages(landingMessages);
  return (
    <div className="flex min-h-dvh flex-1 flex-col overflow-x-clip">
      <main className="flex-1">
        <Hero t={t.hero} />
        <Residues t={t.residues} />
        <Marketplaces t={t.markets} />
        <Quality t={t.quality} />
        <HowItWorks t={t.how} />
        <RoutesSection t={t.routes} />
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

function CtaButton({
  href,
  children,
  tone = "dark",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-14 items-center gap-4 rounded-full ps-7 pe-3 text-[17px] transition-colors sm:text-[18px]",
        tone === "dark"
          ? "bg-primary text-primary-foreground hover:bg-[#0d2a23]"
          : "bg-[#f6f5ef] text-primary hover:bg-white",
        className,
      )}
    >
      {children}
      <span className="flex size-8 items-center justify-center rounded-full bg-honey text-primary transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
        <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
      </span>
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[14px] font-medium uppercase tracking-[0.14em] text-moss">
      <span className="size-1.5 rounded-full bg-honey" />
      {children}
    </p>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-balance text-[36px] font-normal leading-[1.05] tracking-[-0.035em] sm:text-[52px]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

const container = "mx-auto max-w-[1280px] px-5 sm:px-10 lg:px-16";

/* ---------- Hero ---------- */

function Hero({ t }: { t: T["hero"] }) {
  return (
    <section className="relative flex flex-col">
      <SiteHeader />
      <div className="relative z-10 px-5 pt-8 text-center sm:pt-12 lg:pt-16">
        <h1 className="mx-auto max-w-[900px] text-balance text-[44px] font-normal leading-[1.04] tracking-[-0.03em] sm:text-[64px] lg:text-[78px]">
          {t.title}
        </h1>
        <p className="mx-auto mt-6 max-w-[480px] text-pretty text-[17px] leading-snug text-foreground/85 sm:text-[19px]">
          {t.body}
        </p>
        <div className="mt-9 flex justify-center">
          <CtaButton href="/signup">{t.cta}</CtaButton>
        </div>
      </div>

      <div className="relative -mt-6 aspect-[1983/793] min-h-[240px] w-full sm:-mt-[5vw]">
        <Image
          src="/hero-moss-cutout.png"
          alt={t.imageAlt}
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover object-[45%_100%]"
        />
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
      <p className="text-center text-[13px] tracking-[0.02em] text-muted-foreground">{t.label}</p>
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
              className="flex items-center whitespace-nowrap text-[20px] tracking-[-0.03em] text-foreground/45 sm:text-[24px]"
            >
              {name}
              <span className="mx-8 size-1.5 rounded-full bg-honey sm:mx-12" />
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
      <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-moss">{label}</p>
      <ul className="mt-8 space-y-10 lg:space-y-14">
        {points.map((p, i) => {
          const Icon = icons[i];
          return (
          <li key={p.title} className="flex gap-5">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#dfe3c9] text-foreground">
              <Icon className="size-7" strokeWidth={1.5} />
            </span>
            <div className="pt-1">
              <h3 className="text-[19px] tracking-[-0.015em]">{p.title}</h3>
              <p className="mt-2 max-w-[290px] text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

function Marketplaces({ t }: { t: T["markets"] }) {
  return (
    <section id="marketplaces" className="relative scroll-mt-6 overflow-hidden py-24 sm:py-28">
      {/* Thin drawn curves in the corners, as in the design. Decorative and still. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -left-10 top-0 hidden h-[260px] w-[420px] text-moss/35 md:block"
        viewBox="0 0 420 260"
        fill="none"
      >
        <path d="M0 250 C 120 220, 220 150, 300 20" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-0 hidden h-[300px] w-[520px] text-moss/35 md:block"
        viewBox="0 0 520 300"
        fill="none"
      >
        <path d="M60 300 C 180 200, 330 230, 520 40" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
        <Reveal className="mx-auto max-w-[640px] text-center">
          <p className="text-[14px] font-medium uppercase tracking-[0.3em]">{t.eyebrow}</p>
          <SectionTitle className="mt-5">{t.title}</SectionTitle>
          <p className="mx-auto mt-5 max-w-[470px] text-[17px] leading-relaxed text-foreground/75">
            {t.body}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-14 lg:mt-6 lg:grid-cols-[1fr_minmax(0,1.45fr)_1fr] lg:items-start lg:gap-6">
          <Reveal className="lg:order-1 lg:pt-6">
            <PointList label={t.farmLabel} points={t.farm} icons={FARM_ICONS} />
          </Reveal>

          <Reveal delay={0.1} className="relative mx-auto w-full max-w-[640px] lg:order-2 lg:self-center">
            <Image
              src="/globe.png"
              alt={t.globeAlt}
              width={1344}
              height={878}
              sizes="(min-width: 1024px) 640px, 90vw"
              className="relative z-10 h-auto w-full"
            />
            {/* Soft ground shadow (the one in the photo was cut out with its background). */}
            <div
              aria-hidden
              className="mx-auto -mt-2 h-8 w-[55%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(40,52,20,0.32),transparent)] blur-[2px] sm:mt-4"
            />
          </Reveal>

          <Reveal delay={0.16} className="lg:order-3 lg:pt-6">
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

/* ---------- Quality score ---------- */

const READINGS = [
  { value: "19.4 %", pts: "+34", width: "85%" },
  { value: "10.8 %", pts: "+28", width: "70%" },
  { value: "0.3 %", pts: "+30", width: "75%" },
];

function Quality({ t }: { t: T["quality"] }) {
  return (
    <section id="quality" className="scroll-mt-6 bg-primary py-24 text-primary-foreground sm:py-32">
      <div className={cn(container, "grid gap-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20")}>
        <Reveal>
          <p className="flex items-center gap-2 text-[14px] font-medium uppercase tracking-[0.14em] text-honey">
            <span className="size-1.5 rounded-full bg-honey" />
            {t.eyebrow}
          </p>
          <SectionTitle className="mt-5">{t.title}</SectionTitle>
          <p className="mt-6 max-w-[480px] text-[17px] leading-relaxed text-primary-foreground/70">
            {t.body}
          </p>

          <div className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {t.tools.map((tool) => (
              <div key={tool.title} className="border-t border-primary-foreground/15 pt-5">
                <h3 className="text-[18px]">{tool.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-primary-foreground/65">{tool.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-[28px] bg-card p-6 text-card-foreground sm:p-9">
            <div className="flex items-center justify-between text-[14px] text-muted-foreground">
              <span>{t.card.shipment}</span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-moss" /> {t.card.scored}
              </span>
            </div>

            <div className="mt-8 flex items-end justify-between gap-6">
              <div>
                <p className="text-[88px] leading-none tracking-[-0.05em] tabular-nums sm:text-[112px]">92</p>
                <p className="mt-2 text-[15px] text-muted-foreground">{t.card.scoreLabel}</p>
              </div>
              <div className="rounded-2xl bg-moss px-5 py-4 text-white">
                <p className="text-[13px] opacity-80">{t.card.route}</p>
                <p className="text-[24px] leading-tight">{t.card.routeValue}</p>
              </div>
            </div>

            <ul className="mt-9 space-y-5">
              {READINGS.map((r, i) => (
                <li key={t.card.readings[i]}>
                  <div className="flex items-baseline justify-between text-[15px]">
                    <span>
                      {t.card.readings[i]} <span className="text-muted-foreground">{r.value}</span>
                    </span>
                    <span className="tabular-nums text-moss" dir="ltr">
                      {r.pts} {t.card.pts}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-moss" style={{ width: r.width }} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex items-center justify-between border-t border-border pt-5 text-[14px]">
              <span className="text-muted-foreground">{t.card.signed}</span>
              <span className="text-muted-foreground">{t.card.example}</span>
            </div>
          </div>
        </Reveal>
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
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <SectionTitle className="mt-5">{t.title}</SectionTitle>
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
                featured ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              <h3 className="text-[20px]">{p.name}</h3>
              <p className={cn("mt-1 text-[15px]", featured ? "text-primary-foreground/65" : "text-muted-foreground")}>
                {p.lead}
              </p>
              <p className="mt-10 text-[56px] leading-none tracking-[-0.04em]">{p.price}</p>
              <p className={cn("mt-2 text-[15px]", featured ? "text-primary-foreground/65" : "text-muted-foreground")}>
                {p.unit}
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-honey" : "text-moss")} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={cn(
                  "mt-10 flex h-12 items-center justify-center rounded-full text-[16px] transition-colors",
                  featured
                    ? "bg-honey text-primary hover:bg-[#f0b03a]"
                    : "border border-foreground/80 hover:bg-foreground hover:text-background",
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
      {/* Divider from Pricing: the thin green wave used in Routes, not a straight rule. */}
      <svg
        aria-hidden
        // Centred, not edge to edge; the ends fade out softly.
        className="pointer-events-none absolute left-1/2 top-0 h-10 w-[min(900px,80%)] -translate-x-1/2 -translate-y-1/2 text-moss/40 [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] sm:h-14"
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 34 C 180 6, 360 6, 540 28 S 900 52, 1080 26 S 1320 4, 1440 22"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20")}>
        <Reveal>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <SectionTitle className="mt-5">{t.title}</SectionTitle>
        </Reveal>
        <Reveal delay={0.08}>
          <Accordion className="border-t border-border">
            {t.items.map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border-b border-border">
                <AccordionTrigger className="py-6 text-[18px] font-normal hover:no-underline sm:text-[20px]">
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
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[32px] border border-border bg-[#eeede3]">
        <div className="relative z-10 px-6 pt-16 text-center sm:pt-24">
          <h2 className="mx-auto max-w-[760px] text-balance text-[40px] leading-[1.04] tracking-[-0.04em] sm:text-[64px]">
            {t.title}
          </h2>
          <p className="mx-auto mt-5 max-w-[440px] text-[17px] text-muted-foreground">
            {t.body}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CtaButton href="/signup">{t.cta}</CtaButton>
            <Link href="/dashboard?guest=1" className="text-[16px] underline-offset-4 hover:underline">
              {t.guest}
            </Link>
          </div>
        </div>
        <div className="relative h-[clamp(180px,30vw,380px)]">
          <Image
            src="/hero-moss.png"
            alt=""
            fill
            sizes="(min-width: 1280px) 1280px, 100vw"
            className="object-cover object-[60%_30%] [mask-image:linear-gradient(to_bottom,transparent,black_30%)]"
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
            <p className="mt-4 max-w-[280px] text-[15px] text-muted-foreground">
              {t.tagline}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[14px] text-muted-foreground">{col.title}</p>
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

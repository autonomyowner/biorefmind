import Link from "next/link";
import { ArrowRight, BadgeCheck, Camera, FileCheck2 } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import type { LandingMessages } from "@/components/landing/messages";

type How = LandingMessages["how"];

/** How it works: three frosted cards, each with a small preview of that step in the app. */
export function HowItWorks({ t }: { t: How }) {
  const previews = [<ListingPreview key="list" m={t.mock} />, <ScorePreview key="score" m={t.mock} />, <CertificatePreview key="cert" m={t.mock} />];
  return (
    <section id="how-it-works" className="relative scroll-mt-6 overflow-hidden py-24 sm:py-32">
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
        <Reveal className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-[640px]">
            <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-teal">
              <span className="size-1.5 rounded-full bg-gold" />
              {t.eyebrow}
            </p>
            <h2 className="mt-5 text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[58px]">
              {t.title}
            </h2>
            <p className="mt-5 max-w-[500px] text-[17px] leading-relaxed text-muted-foreground sm:text-[18px]">
              {t.body}
            </p>
          </div>
          <Link
            href="/signup"
            className="btn-navy group inline-flex h-14 items-center gap-3.5 self-start rounded-full ps-7 pe-9 text-[17px] font-semibold transition-[filter] hover:brightness-125 sm:h-[60px] lg:self-auto"
          >
            <ArrowRight
              className="size-5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              strokeWidth={2.25}
            />
            {t.cta}
          </Link>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-3 lg:gap-8">
          {t.steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08} className="relative">
              <div className="glass flex h-full flex-col overflow-hidden rounded-[30px]">
                <div className="p-7 sm:p-8">
                  <span className="btn-navy flex size-12 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums">
                    0{i + 1}
                  </span>
                  <h3 className="mt-7 text-[28px] font-semibold tracking-[-0.025em] sm:text-[30px]">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">{step.body}</p>
                </div>
                {/* The step as it looks in the app: decorative, the text above says it all. */}
                <div aria-hidden className="mt-auto px-7 pb-7 sm:px-8 sm:pb-8">
                  {previews[i]}
                </div>
              </div>

              {/* Arrow to the next step: across the gap on desktop, below the card on phones. */}
              {i < t.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-1/2 -bottom-[28px] z-20 flex size-10 -translate-x-1/2 rotate-90 items-center justify-center rounded-full border-2 border-white bg-[#dcf4f7] text-teal shadow-sm lg:top-1/2 lg:bottom-auto lg:left-[calc(100%+16px)] rtl:lg:left-[-16px] lg:-translate-y-1/2 lg:rotate-0"
                >
                  <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
                </span>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Step previews ---------- */

const panel = "rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_18px_40px_-28px_rgba(7,23,51,0.55)]";

function ListingPreview({ m }: { m: How["mock"] }) {
  return (
    <div className={panel}>
      <p className="text-[13px] font-semibold">{m.listing}</p>
      <dl className="mt-3 space-y-2 text-[13px]">
        {[
          [m.residue, m.residueValue],
          [m.quantity, m.quantityValue],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Camera className="size-3.5" /> {m.photos}
        </span>
        <span className="ms-auto flex gap-1.5">
          <span className="size-8 rounded-lg bg-gradient-to-br from-[#f0c46a] to-gold" />
          <span className="size-8 rounded-lg bg-gradient-to-br from-[#e79a5a] to-[#b5552f]" />
          <span className="size-8 rounded-lg bg-gradient-to-br from-[#7ccfa0] to-leaf" />
        </span>
      </div>
    </div>
  );
}

function ScorePreview({ m }: { m: How["mock"] }) {
  // A 92/100 dial: the arc's length is 92% of the circle.
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className={`${panel} flex items-center gap-4`}>
      <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90">
        <defs>
          <linearGradient id="score-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--teal)" />
            <stop offset="100%" stopColor="var(--cyan)" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#score-arc)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${c * 0.92} ${c}`}
        />
        <text x="40" y="40" textAnchor="middle" dominantBaseline="central" transform="rotate(90 40 40)" className="fill-foreground text-[22px] font-semibold">
          92
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{m.score}</p>
        <p className="btn-navy mt-2 inline-block rounded-full px-3 py-1 text-[12px] font-semibold">{m.route}</p>
      </div>
    </div>
  );
}

function CertificatePreview({ m }: { m: How["mock"] }) {
  return (
    <div className={panel}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#dcebf3] text-teal">
          <FileCheck2 className="size-5" strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{m.certificate}</p>
          <p className="text-[12px] text-muted-foreground">{m.batch}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <span className="block h-1.5 w-full rounded-full bg-muted" />
        <span className="block h-1.5 w-4/5 rounded-full bg-muted" />
        <span className="block h-1.5 w-3/5 rounded-full bg-muted" />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-leaf">
        <BadgeCheck className="size-4" /> {m.offer}
      </p>
    </div>
  );
}

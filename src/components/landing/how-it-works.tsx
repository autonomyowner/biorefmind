import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gauge,
  Leaf,
  Recycle,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { Headline, SectionBadge } from "@/components/landing/section-badge";
import { cn } from "@/lib/utils";
import type { LandingMessages } from "@/components/landing/messages";

type How = LandingMessages["how"];

// Step pictures and pill icons, in step order; their words live in the landing messages.
const STEPS: { src: string; width: number; height: number; icon: LucideIcon }[] = [
  { src: "/art/step-list.png", width: 1170, height: 1345, icon: Smartphone },
  { src: "/art/step-score.png", width: 1169, height: 1345, icon: Gauge },
  { src: "/art/step-offer.png", width: 1199, height: 1312, icon: BadgeCheck },
];

const CHIP_ICONS: LucideIcon[] = [Leaf, Recycle];

/** How it works: gradient headline beside the hand-and-globe, then three cards with the app's screens. */
export function HowItWorks({ t }: { t: How }) {
  return (
    <section id="how-it-works" className="relative scroll-mt-6 overflow-hidden py-24 sm:py-32">
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-6">
          <Reveal className="relative z-10">
            <SectionBadge>{t.badge}</SectionBadge>
            <h2 className="mt-6 text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[60px]">
              <Headline lead={t.titleLead} accent={t.titleAccent} />
            </h2>
            <p className="mt-5 max-w-[480px] text-[17px] leading-relaxed text-muted-foreground sm:text-[18px]">
              {t.body}
            </p>
            <Link
              href="/signup"
              className="btn-navy group mt-9 inline-flex h-14 items-center gap-3.5 rounded-full ps-7 pe-9 text-[17px] font-semibold transition-[filter] hover:brightness-125 sm:h-[60px]"
            >
              <ArrowRight
                className="size-5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                strokeWidth={2.25}
              />
              {t.cta}
            </Link>
          </Reveal>

          <Reveal delay={0.1} className="relative">
            <HandAndGlobe t={t} />
          </Reveal>
        </div>

        <div className="mt-16 grid gap-12 lg:mt-12 lg:grid-cols-3 lg:gap-8">
          {t.steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08} className="relative">
              <StepCard step={step} index={i} />

              {/* Arrow to the next step: across the gap on desktop, below the card on phones. */}
              {i < t.steps.length - 1 && (
                <span
                  aria-hidden
                  className="orb absolute left-1/2 -bottom-[34px] z-20 flex size-11 -translate-x-1/2 rotate-90 items-center justify-center rounded-full lg:top-[46%] lg:bottom-auto lg:left-[calc(100%+16px)] rtl:lg:left-[-16px] lg:-translate-y-1/2 lg:rotate-0"
                >
                  <ArrowRight className="size-[18px] rtl:-scale-x-100" strokeWidth={2.5} />
                </span>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The robotic hand offering a glowing globe (background removed), with two still glass chips. */
function HandAndGlobe({ t }: { t: How }) {
  return (
    // On wide screens the arm runs off the page edge, as in the design.
    <div className="bleed-end relative lg:ms-[-4%]">
      {/* A faint glow behind the globe only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute start-[18%] top-[2%] size-[48%] rounded-full bg-[radial-gradient(closest-side,rgba(110,150,255,0.35),transparent)] rtl:start-auto rtl:end-[18%]"
      />
      <div className="relative aspect-[1536/1024]">
        <Image
          src="/art/hand-globe.png"
          alt={t.handAlt}
          fill
          sizes="(min-width: 1024px) 55vw, 100vw"
          // The arm is cut by the picture's bottom edge: fade that edge out.
          className="object-contain rtl:-scale-x-100 [mask-image:linear-gradient(to_bottom,black_78%,transparent)]"
        />
      </div>
      {t.chips.map((chip, i) => {
        const Icon = CHIP_ICONS[i];
        return (
          <span
            key={chip}
            className={cn(
              "absolute hidden items-center gap-2.5 rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 text-[13px] font-medium leading-tight text-[#24366a] shadow-[0_14px_30px_-18px_rgba(40,60,140,0.6)] backdrop-blur sm:flex",
              // The box bleeds past the page edge on wide screens, so the end chip sits further in.
              i === 0 ? "start-[4%] top-[6%]" : "end-[4%] top-[10%] lg:end-[16%]",
            )}
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#e3eafd] text-azure">
              <Icon className="size-4" strokeWidth={1.8} />
            </span>
            {chip}
          </span>
        );
      })}
    </div>
  );
}

function StepCard({ step, index }: { step: How["steps"][number]; index: number }) {
  const art = STEPS[index];
  const PillIcon = art.icon;
  return (
    <div className="glass flex h-full flex-col overflow-hidden rounded-[32px]">
      <div className="relative h-[300px] sm:h-[360px]">
        <span className="orb absolute start-6 top-6 z-10 flex size-14 items-center justify-center rounded-full text-[18px] font-semibold tabular-nums">
          0{index + 1}
        </span>
        <Image
          src={art.src}
          alt={step.alt}
          fill
          sizes="(min-width: 1024px) 380px, 90vw"
          // Background removed: the screen sits straight on the frosted card.
          className="object-contain object-[50%_70%] px-3 pt-4 drop-shadow-[0_24px_30px_rgba(63,90,200,0.22)]"
        />
      </div>
      <div className="flex flex-1 flex-col px-7 pt-2 pb-7 sm:px-8 sm:pb-8">
        <h3 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[32px]">{step.title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">{step.body}</p>
        <div className="mt-7 flex items-center gap-3.5 self-start rounded-2xl border border-white/80 bg-white/60 py-3 ps-3 pe-6 shadow-[0_12px_28px_-20px_rgba(40,60,140,0.6)]">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#e6edff] to-[#d9d6fb] text-azure">
            <PillIcon className="size-5" strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-[14px] font-semibold leading-tight">{step.pillTitle}</span>
            <span className="mt-0.5 block text-[13px] text-muted-foreground">{step.pillBody}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

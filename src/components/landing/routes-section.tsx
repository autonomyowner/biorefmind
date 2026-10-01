import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, Gauge, Recycle, Wheat, type LucideIcon } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";
import type { LandingMessages } from "@/components/landing/messages";

const FACTS: { icon: LucideIcon; value: string }[] = [
  { icon: FlaskConical, value: "80–100" },
  { icon: Wheat, value: "50–79" },
  { icon: Recycle, value: "0–49" },
  { icon: Gauge, value: "0–100" },
];

/** Routes: text and checklist on the left; the dashboard on a mossy branch on the right. */
export function RoutesSection({ t }: { t: LandingMessages["routes"] }) {
  return (
    <section id="routes" className="relative scroll-mt-6 overflow-hidden py-24 sm:py-32">
      <svg
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-6 hidden h-[220px] w-[460px] text-moss/30 md:block"
        viewBox="0 0 460 220"
        fill="none"
      >
        <path d="M0 200 C 140 170, 250 110, 330 0" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-16 px-5 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-6 lg:px-16">
        <Reveal>
          <p className="text-[14px] font-medium uppercase tracking-[0.3em]">{t.eyebrow}</p>
          <h2 className="mt-5 text-balance text-[40px] leading-[1.04] tracking-[-0.035em] sm:text-[56px]">
            {t.title}
          </h2>
          <p className="mt-6 max-w-[500px] text-[17px] leading-relaxed text-foreground/75">
            {t.body}
          </p>
          <ul className="mt-8 space-y-3.5">
            {t.checks.map((c) => (
              <li key={c} className="flex items-start gap-3 text-[16px]">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-moss text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {c}
              </li>
            ))}
          </ul>
          <Link
            href="/#quality"
            className="group mt-10 inline-flex h-14 items-center gap-4 rounded-full bg-primary ps-7 pe-3 text-[17px] text-primary-foreground transition-colors hover:bg-[#0d2a23]"
          >
            {t.cta}
            <span className="flex size-8 items-center justify-center rounded-full bg-honey text-primary transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
            </span>
          </Link>
        </Reveal>

        <Reveal delay={0.1}>
          <BranchScene alt={t.imageAlt} />
        </Reveal>
      </div>

      <Reveal className="mx-auto mt-16 max-w-[1100px] px-5 sm:mt-20 sm:px-10">
        <dl className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {FACTS.map((f, i) => (
            <div
              key={f.value}
              className={cn(
                "flex flex-col items-center text-center",
                i > 0 && "md:border-s md:border-moss/25",
                i % 2 === 1 && "border-s border-moss/25",
              )}
            >
              <f.icon className="size-6 text-foreground" strokeWidth={1.5} />
              {/* A range reads low to high in both languages. */}
              <dd dir="ltr" className="mt-3 text-[30px] tracking-[-0.03em] tabular-nums sm:text-[34px]">
                {f.value}
              </dd>
              <dt className="mt-1 text-[14px] text-muted-foreground sm:text-[15px]">{t.facts[i]}</dt>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}

/* ---------- The scene: a laptop on a mossy branch ---------- */

function BranchScene({ alt }: { alt: string }) {
  return (
    // The branch runs off the right edge in the photo, so let it bleed to the page edge.
    <div className="relative -me-5 sm:-me-10 lg:-me-16 rtl:me-0">
      <Image
        src="/laptop-branch.png"
        alt={alt}
        width={1433}
        height={823}
        sizes="(min-width: 1024px) 60vw, 100vw"
        // The photo cuts the branch off at its right and bottom edges; fade those
        // edges out so no straight cut shows on wide screens.
        className="h-auto w-full [mask-composite:intersect] [mask-image:linear-gradient(to_right,black_80%,transparent),linear-gradient(to_bottom,black_82%,transparent)]"
      />
    </div>
  );
}

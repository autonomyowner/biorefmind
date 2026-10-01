import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";
import type { LandingMessages } from "@/components/landing/messages";

// Step photos, in step order; their words live in the landing messages.
const IMAGES = [
  { src: "/step-list.png", width: 1165, height: 1350 },
  { src: "/step-score.png", width: 1280, height: 1229 },
  { src: "/step-certificate.png", width: 1374, height: 1145 },
];

/** How it works: three cards, each with its step photo blended into the card. */
export function HowItWorks({ t }: { t: LandingMessages["how"] }) {
  return (
    <section id="how-it-works" className="relative scroll-mt-6 overflow-hidden py-24 sm:py-32">
      {/* A thin drawn vine across the top right, as in the design. Decorative and still. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 hidden h-[420px] w-[900px] text-moss/35 lg:block rtl:right-auto rtl:left-0 rtl:-scale-x-100"
        viewBox="0 0 900 420"
        fill="none"
      >
        <path
          d="M40 0 C 170 70, 300 115, 470 125 S 760 150, 830 420"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
        <Reveal className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-[640px]">
            <p className="flex items-center gap-2 text-[14px] font-medium uppercase tracking-[0.14em]">
              <span className="size-1.5 rounded-full bg-moss" />
              {t.eyebrow}
            </p>
            <h2 className="mt-5 text-balance text-[40px] leading-[1.04] tracking-[-0.035em] sm:text-[60px]">
              {t.title}
            </h2>
            <p className="mt-5 max-w-[500px] text-[17px] leading-relaxed text-foreground/70 sm:text-[19px]">
              {t.body}
            </p>
          </div>
          <Link
            href="/signup"
            className="group inline-flex h-16 items-center gap-5 self-start rounded-full bg-primary ps-8 pe-3.5 text-[18px] text-primary-foreground shadow-[0_18px_40px_-18px_rgba(6,23,20,0.6)] transition-colors hover:bg-[#0d2a23] lg:self-auto"
          >
            {t.cta}
            <span className="flex size-9 items-center justify-center rounded-full bg-honey text-primary transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
            </span>
          </Link>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-3 lg:gap-8">
          {t.steps.map((step, i) => {
            const image = IMAGES[i];
            return (
            <Reveal key={step.title} delay={i * 0.08} className="relative">
              <div className="relative flex h-full min-h-[330px] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[#eef1e4] shadow-[0_24px_60px_-40px_rgba(12,36,30,0.45)] sm:flex-row">
                <div className="relative z-10 p-7 sm:w-[54%] sm:p-8">
                  <span className="flex size-12 items-center justify-center rounded-full bg-[#d9e7b8] text-[15px] tabular-nums">
                    0{i + 1}
                  </span>
                  <h3 className="mt-7 text-[28px] tracking-[-0.025em] sm:text-[30px]">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-foreground/70 sm:text-[16px]">{step.body}</p>
                </div>

                {/* Step photo: fills the right side and fades into the card on its left and top. */}
                <div className="relative h-80 sm:absolute sm:inset-y-0 sm:end-0 sm:h-auto sm:w-[56%]">
                  <Image
                    src={image.src}
                    alt={step.alt}
                    fill
                    sizes="(min-width: 1024px) 260px, (min-width: 640px) 56vw, 100vw"
                    className={cn(
                      "object-cover object-center",
                      "[mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent,black_22%),linear-gradient(to_right,black,black)]",
                      "sm:[mask-image:linear-gradient(to_right,transparent,black_32%),linear-gradient(to_bottom,transparent,black_14%)]",
                      "sm:rtl:[mask-image:linear-gradient(to_left,transparent,black_32%),linear-gradient(to_bottom,transparent,black_14%)]",
                    )}
                  />
                </div>
              </div>

              {/* Arrow to the next step: across the gap on desktop, below the card on phones. */}
              {i < t.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-1/2 -bottom-[28px] z-20 flex size-10 -translate-x-1/2 rotate-90 items-center justify-center rounded-full bg-[#d4e7a0] text-primary shadow-sm lg:top-1/2 lg:bottom-auto lg:left-[calc(100%+16px)] rtl:lg:left-[-16px] lg:-translate-y-1/2 lg:rotate-0"
                >
                  <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
                </span>
              )}
            </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

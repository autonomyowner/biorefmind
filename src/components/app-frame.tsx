"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Menu, X, type LucideIcon } from "lucide-react";

import { dirOf } from "@/i18n/locale";
import { useLocale } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export type FrameItem = { href: string; label: string; icon: LucideIcon };

/** The section whose top is nearest above the upper third of the window ("#top" near the page top). */
function useActiveSection(hrefs: string[]): string {
  const [active, setActive] = useState(hrefs[0] ?? "");
  const key = hrefs.join("|");
  useEffect(() => {
    const ids = key.split("|");
    function update() {
      const line = window.innerHeight * 0.33;
      let current = ids[0];
      for (const href of ids) {
        const el = href === "#top" ? null : document.getElementById(href.slice(1));
        if (el && el.getBoundingClientRect().top <= line) current = href;
      }
      // At the very bottom, the last section counts even if its top never reached the line.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        const last = [...ids].reverse().find((h) => h !== "#top" && document.getElementById(h.slice(1)));
        if (last) current = last;
      }
      setActive(current);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [key]);
  return active;
}

/**
 * The frame of the signed-in pages (user dashboards and admin): a sidebar on wide screens,
 * an animated drawer on phones, a sticky top bar, and the content.
 */
export function AppFrame({
  items,
  extra,
  footer,
  headerStart,
  headerEnd,
  menuLabel,
  closeLabel,
  homeHref = "/",
  brandSuffix,
  children,
}: {
  items: FrameItem[];
  extra?: React.ReactNode;
  footer?: React.ReactNode;
  headerStart?: React.ReactNode;
  headerEnd?: React.ReactNode;
  menuLabel: string;
  closeLabel: string;
  homeHref?: string;
  brandSuffix?: string;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const rtl = dirOf(locale) === "rtl";
  const [open, setOpen] = useState(false);
  const active = useActiveSection(items.map((i) => i.href));

  // Escape closes the drawer; the page behind it does not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const nav = (where: "side" | "drawer") => (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-5 flex items-center justify-between">
        <Link href={homeHref} dir="ltr" lang="en" className="flex items-center gap-2 px-2 text-[19px] font-bold tracking-[-0.02em] text-[#08263f]">
          <Image src="/logo-mark.png" alt="" width={77} height={77} className="size-8" />
          BiorefMind{brandSuffix ? <span className="font-medium text-muted-foreground">{brandSuffix}</span> : null}
        </Link>
        {where === "drawer" ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={closeLabel}
            className="inline-flex size-9 items-center justify-center rounded-full border border-foreground/15 bg-white/60"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      {items.map((item) => {
        const on = active === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={on ? "true" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
              on ? "font-medium text-primary-foreground" : "text-foreground/80 hover:bg-white/70",
            )}
          >
            {on ? (
              <motion.span
                layoutId={`frame-active-${where}`}
                className="btn-navy absolute inset-0 rounded-xl"
                transition={{ type: "spring", stiffness: 420, damping: 38 }}
              />
            ) : null}
            <item.icon className="relative size-[18px]" strokeWidth={1.8} />
            <span className="relative">{item.label}</span>
          </a>
        );
      })}
      {extra}
      {footer ? <div className="mt-auto">{footer}</div> : null}
    </nav>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-1 bg-[radial-gradient(ellipse_60%_50%_at_80%_0%,rgba(120,150,255,0.18),transparent_70%)]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-e border-white/70 bg-card/60 backdrop-blur md:block">
          {nav("side")}
        </aside>
        <AnimatePresence>
          {open ? (
            <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label={menuLabel}>
              <motion.button
                type="button"
                aria-label={closeLabel}
                className="absolute inset-0 bg-[#071733]/35 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.aside
                className="absolute inset-y-0 start-0 w-[min(18rem,85vw)] bg-background shadow-2xl"
                initial={{ x: rtl ? "100%" : "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: rtl ? "100%" : "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 40 }}
              >
                {nav("drawer")}
              </motion.aside>
            </div>
          ) : null}
        </AnimatePresence>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-background/75 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  aria-label={menuLabel}
                  aria-expanded={open}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-white/50 md:hidden"
                >
                  <Menu className="size-4" />
                </button>
                {headerStart}
              </div>
              <div className="flex shrink-0 items-center gap-2">{headerEnd}</div>
            </div>
          </header>
          <main id="top" className="mx-auto w-full max-w-6xl flex-1 scroll-mt-20 px-4 py-6 sm:px-8 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}

/** What shows while the signed-in frame waits for the account: the same layout, in grey. */
export function FrameSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1" aria-busy="true">
      <aside className="hidden w-64 shrink-0 border-e border-white/70 bg-card/60 p-4 md:block">
        <span className="mb-6 block h-8 w-36 animate-pulse rounded-xl bg-white/70" />
        {[0, 1, 2].map((i) => (
          <span key={i} className="mb-2 block h-10 animate-pulse rounded-xl bg-white/50" />
        ))}
      </aside>
      <div className="flex-1">
        <div className="h-16 border-b border-white/70" />
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-8">
          <span className="block h-10 w-64 animate-pulse rounded-xl bg-white/60" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="block h-28 animate-pulse rounded-[24px] bg-white/55" />
            ))}
          </div>
          <span className="block h-64 animate-pulse rounded-[28px] bg-white/50" />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Menu, X, type LucideIcon } from "lucide-react";

import { dirOf } from "@/i18n/locale";
import { useLocale } from "@/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * A sidebar item. `href` is either a page path ("/dashboard/sales", active from the URL) or a
 * section hash ("#accounts", active from scrolling). `badge` shows a count when above 0;
 * `group: "general"` puts the item under the "General" label.
 */
export type FrameItem = { href: string; label: string; icon: LucideIcon; badge?: number; group?: "menu" | "general" };

const isRoute = (href: string) => href.startsWith("/");

/** Whether a route item is the current page: exact for a top-level path, by prefix below it. */
export function isActiveRoute(href: string, pathname: string): boolean {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const here = pathname.replace(/\/+$/, "") || "/";
  if (here === path) return true;
  return path.split("/").length > 2 && here.startsWith(`${path}/`);
}

/** The section whose top is nearest above the upper third of the window ("#top" near the page top). */
function useActiveSection(hrefs: string[]): string {
  const [active, setActive] = useState(hrefs[0] ?? "");
  const key = hrefs.join("|");
  useEffect(() => {
    if (!key) return;
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
  groupLabels,
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
  /** Small uppercase labels above the main items and the "general" ones (Settings…). */
  groupLabels?: { menu: string; general: string };
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const rtl = dirOf(locale) === "rtl";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeSection = useActiveSection(items.filter((i) => !isRoute(i.href)).map((i) => i.href));
  const isOn = (href: string) => (isRoute(href) ? isActiveRoute(href, pathname) : activeSection === href);
  const main = items.filter((i) => i.group !== "general");
  const general = items.filter((i) => i.group === "general");

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
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-4">
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
      {groupLabels ? <GroupLabel>{groupLabels.menu}</GroupLabel> : null}
      {main.map((item) => renderItem(item, where))}
      {general.length > 0 ? (
        <>
          {groupLabels ? <GroupLabel className="mt-5">{groupLabels.general}</GroupLabel> : null}
          {general.map((item) => renderItem(item, where))}
        </>
      ) : null}
      {extra}
      {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
    </nav>
  );

  function renderItem(item: FrameItem, where: "side" | "drawer") {
    const on = isOn(item.href);
    const className = cn(
      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
      on ? "font-medium text-primary-foreground" : "text-foreground/80 hover:bg-white/70",
    );
    const body = (
      <>
        {on ? (
          <motion.span
            layoutId={`frame-active-${where}`}
            className="btn-navy absolute inset-0 rounded-xl"
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          />
        ) : null}
        <item.icon className="relative size-[18px]" strokeWidth={1.8} />
        <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <span
            dir="ltr"
            className={cn(
              "relative min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums",
              on ? "bg-white text-azure" : "bg-azure text-white",
            )}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </>
    );
    return isRoute(item.href) ? (
      <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={on ? "page" : undefined} className={className}>
        {body}
      </Link>
    ) : (
      <a key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={on ? "true" : undefined} className={className}>
        {body}
      </a>
    );
  }

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

function GroupLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mb-1 px-3 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase rtl:text-[12px] rtl:tracking-normal", className)}>{children}</p>;
}

/** What shows while the signed-in frame waits for the account: the same layout, in grey. */
export function FrameSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1" aria-busy="true">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-white/70 bg-card/60 p-4 md:flex">
        <span className="mb-6 block h-8 w-36 animate-pulse rounded-xl bg-white/70" />
        <span className="mb-2 ms-3 block h-3 w-12 animate-pulse rounded bg-white/60" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("mb-1.5 block h-10 animate-pulse rounded-xl", i === 0 ? "bg-white/75" : "bg-white/45")} />
        ))}
        <span className="mt-4 mb-2 ms-3 block h-3 w-16 animate-pulse rounded bg-white/60" />
        <span className="block h-10 animate-pulse rounded-xl bg-white/45" />
        <span className="mt-auto block h-16 animate-pulse rounded-2xl bg-white/55" />
      </aside>
      <div className="flex-1">
        <div className="flex h-16 items-center justify-between gap-3 border-b border-white/70 px-4 sm:px-6">
          <span className="block h-7 w-40 animate-pulse rounded-lg bg-white/60" />
          <span className="flex items-center gap-2">
            <span className="block h-10 w-10 animate-pulse rounded-full bg-white/55 md:w-56" />
            <span className="block size-10 animate-pulse rounded-full bg-white/60" />
          </span>
        </div>
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-8">
          <span className="block h-10 w-64 animate-pulse rounded-xl bg-white/60" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("block h-32 animate-pulse rounded-[24px]", i === 0 ? "bg-[#04173a]/15" : "bg-white/55")} />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <span className="block h-64 animate-pulse rounded-[28px] bg-white/50 lg:col-span-2" />
            <span className="block h-64 animate-pulse rounded-[28px] bg-white/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

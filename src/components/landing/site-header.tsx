"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Factory,
  Gauge,
  ListChecks,
  Signpost,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageSwitch } from "@/components/language-switch";
import { landingMessages, type LandingMessages } from "@/components/landing/messages";
import { useMessages } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type NavItem = { label: string; body: string; href: string; icon: LucideIcon };

type Nav = LandingMessages["nav"];

function menusOf(t: Nav): { label: string; items: NavItem[] }[] {
  return [
    {
      label: t.marketplaces,
      items: [
        { ...t.farmers, href: "/#marketplaces", icon: Sprout },
        { ...t.factories, href: "/#marketplaces", icon: Factory },
      ],
    },
    {
      label: t.platform,
      items: [
        { ...t.quality, href: "/#quality", icon: Gauge },
        { ...t.how, href: "/#how-it-works", icon: ListChecks },
        { ...t.routes, href: "/#routes", icon: Signpost },
      ],
    },
  ];
}

/** The BioGrena wordmark, linking home. `label` names the link (e.g. "Back to home"). */
export function Wordmark({ label }: { label?: string }) {
  return (
    <Link
      href="/"
      dir="ltr"
      lang="en"
      aria-label={label}
      title={label}
      className="font-[family-name:var(--font-brand)] text-[22px] font-medium tracking-[-0.03em] sm:text-[26px]"
    >
      BioGrena<sup className="ml-px align-super text-[11px] font-normal sm:text-[13px]">®</sup>
    </Link>
  );
}

function ItemIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-[#dfe3c9] text-foreground transition-colors",
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.6} />
    </span>
  );
}

function DesktopMenu({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        openOnHover
        delay={0}
        closeDelay={90}
        className="group flex items-center gap-1.5 rounded-full px-3 py-2 outline-none transition-colors hover:bg-foreground/[0.05] focus-visible:ring-2 focus-visible:ring-ring/50 data-[popup-open]:bg-foreground/[0.05]"
      >
        {label}
        <ChevronDown
          className="size-3.5 transition-transform duration-200 group-data-[popup-open]:rotate-180"
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={14}
        className={cn(
          "w-[344px] rounded-[22px] border border-border bg-card p-2 shadow-[0_28px_60px_-24px_rgba(12,36,30,0.35)] ring-0",
          // One smooth fade-and-drop instead of the stock zoom/slide keyframes.
          "data-open:animate-none data-closed:animate-none",
          "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
          "data-starting-style:-translate-y-1.5 data-starting-style:opacity-0",
          "data-ending-style:-translate-y-1 data-ending-style:opacity-0 data-ending-style:duration-150",
        )}
      >
        <p className="px-3 pt-2 pb-1.5 text-[12px] font-medium uppercase tracking-[0.16em] text-moss">{label}</p>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            render={<Link href={item.href} />}
            className="group/item flex items-center gap-3.5 rounded-2xl px-3 py-3 text-[15px] transition-colors duration-150 focus:bg-background data-[highlighted]:bg-background"
          >
            <ItemIcon
              icon={item.icon}
              className="duration-150 group-data-[highlighted]/item:bg-moss group-data-[highlighted]/item:text-white"
            />
            <span className="min-w-0 flex-1">
              <span className="block leading-tight text-foreground">{item.label}</span>
              <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">{item.body}</span>
            </span>
            <ArrowRight className="size-4 -translate-x-1 text-foreground rtl:translate-x-1 rtl:-scale-x-100 opacity-0 transition-[opacity,transform] duration-150 group-data-[highlighted]/item:translate-x-0 group-data-[highlighted]/item:opacity-100" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Two lines that turn into an X. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-3 w-[18px]">
      <span
        className={cn(
          "absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-all duration-300",
          open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
        )}
      />
      <span
        className={cn(
          "absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-all duration-300",
          open ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-full -translate-y-full",
        )}
      />
    </span>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

// Panel fades in, then its groups rise in one after another; closing is quick.
const panel = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: EASE, staggerChildren: 0.05, delayChildren: 0.03 } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE } },
};
const group = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

function MobileMenu({ t, menus, onClose }: { t: Nav; menus: ReturnType<typeof menusOf>; onClose: () => void }) {
  const links = [
    { label: t.pricing, href: "/#pricing" },
    { label: t.faq, href: "/#faq" },
  ];
  return (
    <motion.div
      id="mobile-menu"
      variants={panel}
      initial="hidden"
      animate="show"
      exit="exit"
      className="absolute inset-x-0 top-full flex h-[calc(100dvh-5rem)] flex-col overflow-y-auto border-t border-border bg-background px-5 pt-6 pb-8 lg:hidden"
    >
      {menus.map((menu) => (
        <motion.div key={menu.label} variants={group} className="mb-6">
          <p className="px-1 text-[12px] font-medium uppercase tracking-[0.16em] text-moss">{menu.label}</p>
          <ul className="mt-2 overflow-hidden rounded-[22px] border border-border bg-card">
            {menu.items.map((item) => (
              <li key={item.label} className="border-b border-border last:border-0">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-background"
                >
                  <ItemIcon icon={item.icon} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] leading-tight">{item.label}</span>
                    <span className="mt-1 block text-[13px] text-muted-foreground">{item.body}</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}

      <motion.ul variants={group} className="px-1">
        {links.map((l) => (
          <li key={l.label} className="border-b border-border">
            <Link href={l.href} onClick={onClose} className="flex items-center justify-between py-4 text-[20px] tracking-[-0.02em]">
              {l.label}
              <ArrowRight className="size-4 text-muted-foreground rtl:-scale-x-100" />
            </Link>
          </li>
        ))}
      </motion.ul>

      <motion.div variants={group} className="mt-auto grid gap-3 pt-8">
        <Link
          href="/signup"
          className="flex h-14 items-center justify-between rounded-full bg-primary ps-6 pe-3 text-[17px] text-primary-foreground"
        >
          {t.createAccount}
          <span className="flex size-8 items-center justify-center rounded-full bg-honey text-primary">
            <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
          </span>
        </Link>
        <Link
          href="/login"
          className="flex h-14 items-center justify-center rounded-full border border-foreground/80 text-[17px]"
        >
          {t.signIn}
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function SiteHeader() {
  const t = useMessages(landingMessages).nav;
  const menus = menusOf(t);
  const [open, setOpen] = useState(false);

  // While the phone menu is open: no page scroll behind it, Escape closes it,
  // and growing past the phone breakpoint closes it too.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <header className="relative z-30">
      <div className="mx-auto flex h-20 max-w-[1680px] items-center justify-between px-5 sm:h-24 sm:px-10 lg:px-[70px]">
        <Wordmark />

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-4 text-[16px] lg:flex">
          {menus.map((menu) => (
            <DesktopMenu key={menu.label} {...menu} />
          ))}
          <Link
            href="/#pricing"
            className="rounded-full px-3 py-2 transition-colors hover:bg-foreground/[0.05]"
          >
            {t.pricing}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Link
            href="/login"
            className="hidden h-11 items-center rounded-full border border-foreground/80 px-6 text-[16px] transition-colors hover:bg-foreground hover:text-background sm:inline-flex"
          >
            {t.signIn}
          </Link>
          <button
            type="button"
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full border border-foreground/80 transition-colors lg:hidden",
              open && "bg-foreground text-background",
            )}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      <AnimatePresence>{open && <MobileMenu t={t} menus={menus} onClose={() => setOpen(false)} />}</AnimatePresence>
    </header>
  );
}

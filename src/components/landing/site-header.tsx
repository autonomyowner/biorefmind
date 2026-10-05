"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Factory,
  FlaskConical,
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
        { ...t.labs, href: "/#marketplaces", icon: FlaskConical },
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

/** The BiorefMind emblem and wordmark, linking home. `label` names the link (e.g. "Back to home"). */
export function Wordmark({ label, className }: { label?: string; className?: string }) {
  return (
    <Link
      href="/"
      dir="ltr"
      lang="en"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-2.5 font-[family-name:var(--font-brand)] text-[24px] font-bold tracking-[-0.03em] text-[#08263f] sm:text-[28px]",
        className,
      )}
    >
      <Image src="/logo-mark.png" alt="" width={77} height={77} priority className="size-9 sm:size-11" />
      BiorefMind
    </Link>
  );
}

function ItemIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-[#dcebf3] text-azure transition-colors",
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
        className="group flex items-center gap-1.5 px-1 py-2 text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[popup-open]:text-foreground"
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
          "w-[344px] rounded-[22px] border border-white/80 bg-card p-2 shadow-[0_28px_60px_-24px_rgba(7,23,51,0.35)] ring-0",
          // One smooth fade-and-drop instead of the stock zoom/slide keyframes.
          "data-open:animate-none data-closed:animate-none",
          "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
          "data-starting-style:-translate-y-1.5 data-starting-style:opacity-0",
          "data-ending-style:-translate-y-1 data-ending-style:opacity-0 data-ending-style:duration-150",
        )}
      >
        <p className="px-3 pt-2 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-azure">{label}</p>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            render={<Link href={item.href} />}
            className="group/item flex items-center gap-3.5 rounded-2xl px-3 py-3 text-[15px] transition-colors duration-150 focus:bg-background data-[highlighted]:bg-background"
          >
            <ItemIcon
              icon={item.icon}
              className="duration-150 group-data-[highlighted]/item:bg-primary group-data-[highlighted]/item:text-[#a9bcff]"
            />
            <span className="min-w-0 flex-1">
              <span className="block leading-tight font-medium text-foreground">{item.label}</span>
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

function MobileMenu({
  t,
  menus,
  signedIn,
  onClose,
}: {
  t: Nav;
  menus: ReturnType<typeof menusOf>;
  signedIn: boolean;
  onClose: () => void;
}) {
  const links = [
    { label: t.market, href: "/marketplace" },
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
      className="absolute inset-x-0 top-full flex h-[calc(100dvh-5rem)] flex-col sm:h-[calc(100dvh-7rem)] overflow-y-auto border-t border-border bg-background px-5 pt-6 pb-8 xl:hidden"
    >
      {/* Phones have no room for the language switch in the header bar. */}
      <motion.div variants={group} className="mb-6 sm:hidden">
        <LanguageSwitch />
      </motion.div>
      {menus.map((menu) => (
        <motion.div key={menu.label} variants={group} className="mb-6">
          <p className="px-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-azure">{menu.label}</p>
          <ul className="mt-2 overflow-hidden rounded-[22px] border border-white/80 bg-card">
            {menu.items.map((item) => (
              <li key={item.label} className="border-b border-border last:border-0">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-background"
                >
                  <ItemIcon icon={item.icon} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] leading-tight font-medium">{item.label}</span>
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
            <Link href={l.href} onClick={onClose} className="flex items-center justify-between py-4 text-[20px] font-medium tracking-[-0.02em]">
              {l.label}
              <ArrowRight className="size-4 text-muted-foreground rtl:-scale-x-100" />
            </Link>
          </li>
        ))}
      </motion.ul>

      <motion.div variants={group} className="mt-auto grid gap-3 pt-8">
        <Link
          href={signedIn ? "/dashboard" : "/signup"}
          className="btn-navy flex h-14 items-center justify-center gap-3 rounded-full text-[17px] font-semibold"
        >
          <ArrowRight className="size-5 rtl:-scale-x-100" strokeWidth={2.25} />
          {signedIn ? t.dashboard : t.createAccount}
        </Link>
        {signedIn ? null : (
          <Link
            href="/login"
            className="flex h-14 items-center justify-center rounded-full border border-foreground/20 bg-white/40 text-[17px] font-medium"
          >
            {t.signIn}
          </Link>
        )}
      </motion.div>
    </motion.div>
  );
}

/** A top-level header link; the current page's link is underlined. */
function NavLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn("relative py-2 transition-colors", current ? "font-medium text-foreground" : "text-foreground/70 hover:text-foreground")}
    >
      {children}
      {current ? <span aria-hidden className="absolute inset-x-0 -bottom-1 h-[2px] rounded-full bg-foreground" /> : null}
    </Link>
  );
}

/** When signedIn (from the session cookie), "Sign in" becomes "Dashboard". `current` underlines that page's link. */
export function SiteHeader({ signedIn = false, current = "home" }: { signedIn?: boolean; current?: "home" | "market" }) {
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
    const mq = window.matchMedia("(min-width: 1280px)");
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
    <header className={cn("relative z-30", open && "bg-background")}>
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:h-28 sm:px-10 lg:px-16">
        <Wordmark />

        <nav className="hidden items-center gap-9 text-[17px] xl:flex">
          <NavLink href="/" current={current === "home"}>
            {t.home}
          </NavLink>
          <NavLink href="/marketplace" current={current === "market"}>
            {t.market}
          </NavLink>
          {menus.map((menu) => (
            <DesktopMenu key={menu.label} {...menu} />
          ))}
          <Link href="/#pricing" className="py-2 text-foreground/70 transition-colors hover:text-foreground">
            {t.pricing}
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitch className="hidden sm:inline-flex" />
          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className="btn-navy group hidden h-12 items-center gap-3 whitespace-nowrap rounded-full ps-7 pe-6 text-[16px] font-semibold transition-[filter] hover:brightness-125 sm:inline-flex"
          >
            {signedIn ? t.dashboard : t.signIn}
            <ArrowRight
              className="size-[18px] transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              strokeWidth={2.25}
            />
          </Link>
          <button
            type="button"
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full border border-foreground/20 bg-white/40 transition-colors xl:hidden",
              open && "btn-navy border-transparent",
            )}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      <AnimatePresence>{open && <MobileMenu t={t} menus={menus} signedIn={signedIn} onClose={() => setOpen(false)} />}</AnimatePresence>
    </header>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Languages, ListChecks, LogOut, PackageSearch, Plus, type LucideIcon } from "lucide-react";

import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { DASH, withGuest } from "@/components/dashboard/links";
import { dashboardMessages } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { PAGE_ICON, useDashPages, useDashboard } from "@/components/dashboard/shell";
import { saveLocale } from "@/i18n/actions";
import { LOCALE_COOKIE } from "@/i18n/locale";
import { useLocale, useMessages } from "@/i18n/provider";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §2 (⌘K command palette)

type Action = { key: string; label: string; icon: LucideIcon; run: () => void };

const ITEM = "gap-3 rounded-xl px-3 py-2.5 text-[15px] data-[selected=true]:bg-[#eef2ff] data-[selected=true]:text-foreground";

/** ⌘K / Ctrl+K: go to any page of the account, or run one of a few actions. Keeps `?guest=1`. */
export function CommandPalette({ open, onOpenChange, onSignOut }: { open: boolean; onOpenChange: (open: boolean) => void; onSignOut: () => void }) {
  const { workspace, guest } = useDashboard();
  const pages = useDashPages();
  const router = useRouter();
  const locale = useLocale();
  const t = useMessages(pagesMessages);
  const nav = useMessages(dashboardMessages).nav;
  const [, startTransition] = useTransition();

  function go(href: string) {
    onOpenChange(false);
    router.push(withGuest(href, guest));
  }

  function switchLanguage() {
    const next = locale === "ar" ? "en" : "ar";
    onOpenChange(false);
    startTransition(async () => {
      try {
        await saveLocale(next);
        router.refresh();
      } catch {
        // Same fallback as the language switch: set the cookie here and reload.
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        window.location.reload();
      }
    });
  }

  const main: Action[] =
    workspace.kind === "farm"
      ? [{ key: "new-listing", label: t.palette.newListing, icon: Plus, run: () => go(`${DASH.listings}?new=1`) }]
      : workspace.kind === "factory"
        ? [
            { key: "browse", label: t.palette.browseLots, icon: PackageSearch, run: () => go(DASH.browse) },
            { key: "offers", label: nav.pages.offers, icon: HandCoins, run: () => go(DASH.offers) },
          ]
        : [{ key: "requests", label: t.palette.openRequests, icon: ListChecks, run: () => go(DASH.requests) }];
  const actions: Action[] = [
    ...main,
    { key: "language", label: t.palette.switchLanguage, icon: Languages, run: switchLanguage },
    ...(guest
      ? []
      : [
          {
            key: "sign-out",
            label: t.palette.signOut,
            icon: LogOut,
            run: () => {
              onOpenChange(false);
              onSignOut();
            },
          },
        ]),
  ];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.palette.title}
      description={t.frame.searchLabel}
      className="rounded-[24px] border border-white/80 bg-card p-0 shadow-[0_32px_70px_-28px_rgba(7,23,51,0.45)] ring-0 sm:max-w-lg"
    >
      <Command className="rounded-[24px] bg-transparent p-0">
        <CommandInput placeholder={t.palette.placeholder} className="text-[15px]" />
        <CommandList className="p-2">
          <CommandEmpty className="py-8 text-[14px] text-muted-foreground">{t.palette.empty}</CommandEmpty>
          <CommandGroup heading={t.palette.pages}>
            {pages.map((p) => {
              const Icon = PAGE_ICON[p];
              return (
                <CommandItem key={p} value={`page ${p} ${nav.pages[p]}`} onSelect={() => go(DASH[p])} className={ITEM}>
                  <Icon className="size-[18px] text-azure" strokeWidth={1.8} />
                  {nav.pages[p]}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator className="my-1" />
          <CommandGroup heading={t.palette.actions}>
            {actions.map((a) => (
              <CommandItem key={a.key} value={`action ${a.key} ${a.label}`} onSelect={a.run} className={ITEM}>
                <a.icon className={a.key === "sign-out" ? "size-[18px] text-violet rtl:-scale-x-100" : "size-[18px] text-violet"} strokeWidth={1.8} />
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

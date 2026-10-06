"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Search, Settings, ShieldCheck } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DASH, withGuest } from "@/components/dashboard/links";
import { dashboardMessages } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { useDashboard } from "@/components/dashboard/shell";
import { useMessages } from "@/i18n/provider";
import { cn } from "@/lib/utils";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §2 (top bar)

/** The current page's title, with the account type above it in small azure text (not on phones). */
export function PageTitle({ title }: { title: string }) {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  return (
    <div className="min-w-0">
      <p className="hidden text-[12px] leading-none font-medium text-azure sm:block">{t.kinds[workspace.kind]}</p>
      <p className="truncate text-[19px] leading-tight font-semibold tracking-[-0.02em] sm:mt-1 sm:text-[21px]">{title}</p>
    </div>
  );
}

/** Opens the command palette: a search field at the start of the bar on wide screens, an icon on phones. */
export function SearchButton({ onOpen, variant }: { onOpen: () => void; variant: "field" | "icon" }) {
  const t = useMessages(pagesMessages);
  const field = variant === "field";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t.frame.searchLabel}
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 bg-white/55 text-[14px] text-muted-foreground transition-colors hover:bg-white",
        field ? "w-72 justify-start px-3.5 lg:w-80" : "w-10 justify-center",
      )}
    >
      <Search className="size-4 shrink-0" />
      {field ? (
        <>
          <span className="flex-1 text-start">{t.frame.search}</span>
          <kbd dir="ltr" className="rounded-md border border-foreground/10 bg-white/80 px-1.5 py-0.5 font-sans text-[11px] text-foreground/60">
            ⌘K
          </kbd>
        </>
      ) : null}
    </button>
  );
}

/** First letters of the first two words ("Ferme Saïd" → "FS"). */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Initials in an orb (+ workspace name on wide screens); opens Settings, Admin, Sign out. */
export function AvatarMenu({ onSignOut }: { onSignOut: () => void }) {
  const { workspace, viewer, guest } = useDashboard();
  const router = useRouter();
  const t = useMessages(pagesMessages);
  const kinds = useMessages(dashboardMessages).kinds;
  const item = "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] data-[highlighted]:bg-background";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.frame.accountMenu}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 bg-white/55 p-0.5 transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-azure/40 data-[popup-open]:bg-white lg:pe-3"
      >
        <span className="orb flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">{initialsOf(workspace.name)}</span>
        <span className="hidden max-w-40 truncate text-[14px] font-medium lg:inline">{workspace.name}</span>
        <ChevronDown className="hidden size-4 text-muted-foreground lg:inline" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-[20px] border border-white/80 bg-card p-2 shadow-[0_28px_60px_-24px_rgba(7,23,51,0.35)] ring-0"
      >
        <div className="flex items-center gap-3 px-3 pt-2 pb-3">
          <span className="orb flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold">{initialsOf(workspace.name)}</span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold">{workspace.name}</span>
            <span className="block truncate text-[13px] text-muted-foreground">
              {kinds[workspace.kind]} · {viewer.email}
            </span>
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={item} onClick={() => router.push(withGuest(DASH.settings, guest))}>
          <Settings className="size-4" /> {t.frame.settings}
        </DropdownMenuItem>
        {viewer.isAdmin ? (
          <DropdownMenuItem className={item} onClick={() => router.push("/admin")}>
            <ShieldCheck className="size-4" /> {t.frame.admin}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem className={item} onClick={guest ? () => router.push("/") : onSignOut}>
          <LogOut className="size-4 rtl:-scale-x-100" /> {guest ? t.frame.exitPreview : t.frame.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

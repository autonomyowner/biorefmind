"use client";

import { createContext, use, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import {
  ChartColumn,
  CreditCard,
  FlaskConical,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  MapPin,
  PackageSearch,
  Receipt,
  Settings,
  Sparkles,
  ShieldCheck,
  Sprout,
  Tags,
  type LucideIcon,
} from "lucide-react";

import { LanguageSwitch } from "@/components/language-switch";
import { AppFrame, FrameSkeleton, type FrameItem } from "@/components/app-frame";
import { forwardHash } from "@/components/dashboard/forward-hash";
import { WithBadges, type Badges } from "@/components/dashboard/frame/badges";
import { CommandPalette } from "@/components/dashboard/frame/command-palette";
import { AvatarMenu, PageTitle, SearchButton, initialsOf } from "@/components/dashboard/frame/top-bar";
import { PAGES, pageOfPath } from "@/components/dashboard/frame/pages";
import { DASH, withGuest, type DashPage } from "@/components/dashboard/links";
import { dashboardMessages } from "@/components/dashboard/messages";
import { useMessages } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/backend";
import type { Viewer, Workspace } from "@/lib/types";

type Dashboard = { workspace: Workspace; viewer: NonNullable<Viewer>; guest: boolean };

const DashboardContext = createContext<Dashboard | null>(null);

/** The signed-in person and their workspace (sample data in guest preview). */
export function useDashboard(): Dashboard {
  const ctx = use(DashboardContext);
  if (!ctx) throw new Error("useDashboard outside DashboardShell");
  return ctx;
}

/** What `?guest=1` shows: a farmer account with sample content and no backend calls. */
const GUEST: Dashboard = {
  guest: true,
  viewer: { _id: "guest", email: "guest@biorefmind.app", name: "Saïd", isAdmin: false },
  workspace: {
    companyId: "guest" as Workspace["companyId"],
    name: "Ferme Saïd",
    kind: "farm",
    role: "owner",
    region: "Sétif",
    phone: "+213 555 12 34 56",
    plan: "free",
  },
};

/** The icon of every dashboard page (sidebar and ⌘K). */
export const PAGE_ICON: Record<DashPage, LucideIcon> = {
  overview: LayoutDashboard,
  assistant: Sparkles,
  listings: Sprout,
  sales: Receipt,
  browse: PackageSearch,
  offers: HandCoins,
  labs: FlaskConical,
  requests: ListChecks,
  prices: Tags,
  analytics: ChartColumn,
  plan: CreditCard,
  settings: Settings,
};

/** The pages the signed-in account has, in sidebar order (for the ⌘K palette and links). */
export function useDashPages(): readonly DashPage[] {
  return PAGES[useDashboard().workspace.kind];
}

/** Auth guard + the dashboard frame: sidebar for the account's type, top bar, content. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useMessages(dashboardMessages);
  const guest = useSearchParams().get("guest") === "1";
  const { isLoading, isAuthenticated } = useConvexAuth();
  const live = isAuthenticated && !guest;
  const viewer = useQuery(api.users.viewer, live ? {} : "skip") as Viewer | undefined;
  const workspaces = useQuery(api.companies.mine, live ? {} : "skip") as Workspace[] | undefined;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (guest || isLoading || leaving) return;
    if (!isAuthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (viewer === null || (workspaces && workspaces.length === 0)) router.replace("/onboarding");
  }, [guest, isLoading, isAuthenticated, viewer, workspaces, pathname, router, leaving]);

  async function signOut() {
    setLeaving(true);
    await authClient.signOut();
    router.replace("/login");
  }

  const value: Dashboard | null = guest
    ? GUEST
    : viewer && workspaces && workspaces.length > 0
      ? { viewer, workspace: workspaces[0], guest: false }
      : null;

  // A page this account does not have (a lab on /dashboard/listings) goes to the Overview.
  const pages = value ? PAGES[value.workspace.kind] : null;
  const page = pageOfPath(pathname);
  const allowed = !pages || page === null || pages.includes(page);
  useEffect(() => {
    if (!allowed) router.replace(withGuest(DASH.overview, guest));
  }, [allowed, guest, router]);

  // Old one-page links (/dashboard#sales) open their page, once the account's pages are known,
  // also when only the hash changes while already on the Overview.
  const onOverview = page === "overview";
  useEffect(() => {
    if (!pages || !onOverview) return;
    const forward = () => {
      const target = forwardHash(window.location.hash, pages);
      if (target) router.replace(withGuest(target, guest));
    };
    forward();
    window.addEventListener("hashchange", forward);
    return () => window.removeEventListener("hashchange", forward);
  }, [pages, onOverview, guest, router]);

  // ⌘K / Ctrl+K opens the command palette (and closes it again). Listening from the first paint:
  // a press while the account still loads opens the palette as soon as the frame shows.
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!value || !pages) return <FrameSkeleton />;

  const items = (badges: Badges): FrameItem[] =>
    pages.map((p) => ({
      href: withGuest(DASH[p], guest),
      label: t.nav.pages[p],
      icon: PAGE_ICON[p],
      badge: badges[p],
      group: p === "settings" ? "general" : "menu",
    }));
  const title = t.nav.pages[page ?? "overview"];

  const adminLink = value.viewer.isAdmin ? (
    <Link
      href="/admin"
      className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-foreground/80 transition-colors hover:bg-white/70"
    >
      <ShieldCheck className="size-[18px]" strokeWidth={1.8} />
      {t.nav.admin}
    </Link>
  ) : null;

  const identity = (
    <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/55 p-3 text-[13px]">
      <span className="orb flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">
        {initialsOf(value.workspace.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{value.workspace.name}</span>
        <span className="flex items-center gap-1 truncate text-muted-foreground">
          {value.workspace.region ? <MapPin className="size-3.5 shrink-0 text-azure" /> : null}
          {value.workspace.region || t.kinds[value.workspace.kind]}
        </span>
      </span>
    </div>
  );

  // Like the reference: search at the start of the bar on wide screens (the page carries its own
  // title); on phones the bar shows the title and a search icon.
  const headerStart = (
    <>
      <div className="min-w-0 md:hidden">
        <PageTitle title={title} />
      </div>
      <div className="hidden md:block">
        <SearchButton variant="field" onOpen={() => setPaletteOpen(true)} />
      </div>
    </>
  );
  const headerEnd = (
    <>
      <div className="md:hidden">
        <SearchButton variant="icon" onOpen={() => setPaletteOpen(true)} />
      </div>
      <LanguageSwitch className="hidden h-10 sm:inline-flex" />
      <AvatarMenu onSignOut={signOut} />
    </>
  );

  return (
    <DashboardContext value={value}>
      <WithBadges>
        {(badges) => (
          <AppFrame
            items={items(badges)}
            groupLabels={{ menu: t.nav.groupMenu, general: t.nav.groupGeneral }}
            menuLabel={t.nav.menu}
            closeLabel={t.nav.closeMenu}
            extra={adminLink}
            footer={identity}
            headerStart={headerStart}
            headerEnd={headerEnd}
          >
            {allowed ? children : null}
          </AppFrame>
        )}
      </WithBadges>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onSignOut={signOut} />
    </DashboardContext>
  );
}

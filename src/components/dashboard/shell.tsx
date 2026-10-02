"use client";

import { createContext, use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import {
  Building2,
  FlaskConical,
  Home,
  ListChecks,
  LogOut,
  Menu,
  PackageSearch,
  ShieldCheck,
  Sprout,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { LanguageSwitch } from "@/components/language-switch";
import { Spinner } from "@/components/ui/spinner";
import { dashboardMessages, type DashboardMessages } from "@/components/dashboard/messages";
import { useMessages } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/backend";
import type { Kind, Viewer, Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";

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

type NavItem = { href: string; label: keyof DashboardMessages["nav"]; icon: LucideIcon };

const NAV: Record<Kind, NavItem[]> = {
  farm: [
    { href: "#top", label: "home", icon: Home },
    { href: "#listings", label: "listings", icon: Sprout },
    { href: "#labs", label: "labs", icon: FlaskConical },
  ],
  lab: [
    { href: "#top", label: "home", icon: Home },
    { href: "#profile", label: "profile", icon: UserRound },
    { href: "#requests", label: "requests", icon: ListChecks },
  ],
  factory: [
    { href: "#top", label: "home", icon: Home },
    { href: "#browse", label: "browse", icon: PackageSearch },
    { href: "#labs", label: "labs", icon: FlaskConical },
    { href: "#enterprise", label: "enterprise", icon: Building2 },
  ],
};

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
  const [menuOpen, setMenuOpen] = useState(false);

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

  if (!value) return <Spinner className="flex flex-1 items-center" />;

  const items = NAV[value.workspace.kind];
  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link href="/" dir="ltr" lang="en" className="mb-5 flex items-center gap-2 px-2 text-[19px] font-bold tracking-[-0.02em] text-[#08263f]">
        <Image src="/logo-mark.png" alt="" width={77} height={77} className="size-8" />
        BiorefMind
      </Link>
      {items.map((item, i) => (
        <a
          key={item.href}
          href={item.href}
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
            i === 0 ? "btn-navy font-medium" : "text-foreground/80 hover:bg-white/70",
          )}
        >
          <item.icon className="size-[18px]" strokeWidth={1.8} />
          {t.nav[item.label]}
        </a>
      ))}
      {value.viewer.isAdmin ? (
        <Link
          href="/admin"
          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-foreground/80 transition-colors hover:bg-white/70"
        >
          <ShieldCheck className="size-[18px]" strokeWidth={1.8} />
          {t.nav.admin}
        </Link>
      ) : null}
      <div className="mt-auto rounded-2xl border border-white/80 bg-white/55 p-3 text-[13px]">
        <p className="truncate font-semibold">{value.workspace.name}</p>
        <p className="mt-0.5 text-muted-foreground">{t.kinds[value.workspace.kind]}</p>
      </div>
    </nav>
  );

  return (
    <DashboardContext value={value}>
      <div className="flex min-h-dvh flex-1 bg-[radial-gradient(ellipse_60%_50%_at_80%_0%,rgba(120,150,255,0.18),transparent_70%)]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-e border-white/70 bg-card/60 backdrop-blur md:block">
          {sidebar}
        </aside>
        {menuOpen ? (
          <div className="fixed inset-0 z-30 md:hidden">
            <button
              type="button"
              aria-label={t.nav.closeMenu}
              className="absolute inset-0 bg-[#071733]/30"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="relative h-full w-72 bg-background shadow-xl">{sidebar}</aside>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-background/75 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label={t.nav.menu}
                className="inline-flex size-10 items-center justify-center rounded-full border border-foreground/15 bg-white/50 md:hidden"
              >
                {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
              <p className="hidden truncate text-[15px] text-muted-foreground md:block">{value.workspace.region}</p>
              <div className="flex items-center gap-2">
                <LanguageSwitch className="h-10" />
                {value.guest ? (
                  <Link href="/" className="inline-flex h-10 items-center rounded-full border border-foreground/15 bg-white/50 px-4 text-[14px] font-medium">
                    {t.nav.exitGuest}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={signOut}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 bg-white/50 px-4 text-[14px] font-medium transition-colors hover:bg-white"
                  >
                    <LogOut className="size-4 rtl:-scale-x-100" />
                    <span className="hidden sm:inline">{t.nav.signOut}</span>
                  </button>
                )}
              </div>
            </div>
          </header>
          <main id="top" className="mx-auto w-full max-w-6xl flex-1 scroll-mt-20 px-4 py-6 sm:px-8 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext>
  );
}

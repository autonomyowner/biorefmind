"use client";

import { createContext, use, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import {
  Building2,
  CreditCard,
  FlaskConical,
  HandCoins,
  Home,
  ListChecks,
  LogOut,
  MapPin,
  PackageSearch,
  Receipt,
  ShieldCheck,
  Sprout,
  Tags,
  TestTubes,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { LanguageSwitch } from "@/components/language-switch";
import { AppFrame, FrameSkeleton } from "@/components/app-frame";
import { dashboardMessages, type DashboardMessages } from "@/components/dashboard/messages";
import { useMessages } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/backend";
import type { Kind, Viewer, Workspace } from "@/lib/types";

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
    { href: "#sales", label: "sales", icon: Receipt },
    { href: "#labtests", label: "labtests", icon: TestTubes },
    { href: "#labs", label: "labs", icon: FlaskConical },
  ],
  lab: [
    { href: "#top", label: "home", icon: Home },
    { href: "#requests", label: "requests", icon: ListChecks },
    { href: "#prices", label: "prices", icon: Tags },
    { href: "#profile", label: "profile", icon: UserRound },
    { href: "#plan", label: "plan", icon: CreditCard },
  ],
  factory: [
    { href: "#top", label: "home", icon: Home },
    { href: "#browse", label: "browse", icon: PackageSearch },
    { href: "#offers", label: "offers", icon: HandCoins },
    { href: "#sales", label: "sales", icon: Receipt },
    { href: "#labtests", label: "labtests", icon: TestTubes },
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

  if (!value) return <FrameSkeleton />;

  const items = NAV[value.workspace.kind].map((i) => ({ ...i, label: t.nav[i.label] }));
  const initials = value.workspace.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DashboardContext value={value}>
      <AppFrame
        items={items}
        menuLabel={t.nav.menu}
        closeLabel={t.nav.closeMenu}
        extra={
          value.viewer.isAdmin ? (
            <Link
              href="/admin"
              className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-foreground/80 transition-colors hover:bg-white/70"
            >
              <ShieldCheck className="size-[18px]" strokeWidth={1.8} />
              {t.nav.admin}
            </Link>
          ) : null
        }
        footer={
          <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/55 p-3 text-[13px]">
            <span className="orb flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">{initials}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{value.workspace.name}</span>
              <span className="block text-muted-foreground">{t.kinds[value.workspace.kind]}</span>
            </span>
          </div>
        }
        headerStart={
          value.workspace.region ? (
            <p className="hidden min-w-0 items-center gap-1.5 truncate text-[15px] text-muted-foreground sm:flex">
              <MapPin className="size-4 shrink-0 text-azure" /> {value.workspace.region}
            </p>
          ) : null
        }
        headerEnd={
          <>
            <LanguageSwitch className="h-10" />
            {value.guest ? (
              <Link href="/" className="inline-flex h-10 items-center rounded-full border border-foreground/15 bg-white/50 px-4 text-[14px] font-medium">
                {t.nav.exitGuest}
              </Link>
            ) : (
              <button
                type="button"
                onClick={signOut}
                aria-label={t.nav.signOut}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 bg-white/50 px-3 text-[14px] font-medium transition-colors hover:bg-white sm:px-4"
              >
                <LogOut className="size-4 rtl:-scale-x-100" />
                <span className="hidden sm:inline">{t.nav.signOut}</span>
              </button>
            )}
          </>
        }
      >
        {children}
      </AppFrame>
    </DashboardContext>
  );
}

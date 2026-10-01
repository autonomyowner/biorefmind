"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/backend";
import type { Viewer, Workspace } from "@/lib/types";

/** Placeholder sidebar entries; real navigation comes later. */
const SIDEBAR_ITEMS = ["Dashboard", "Item 1", "Item 2", "Item 3", "Item 4"];

/** Auth guard + an empty iOS-style frame: sidebar, top bar, grey body. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // `?guest=1` previews the empty dashboard without an account (skeleton only).
  const guest = useSearchParams().get("guest") === "1";
  const { isLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip") as Viewer | null | undefined;
  const workspaces = useQuery(api.companies.mine, isAuthenticated ? {} : "skip") as Workspace[] | undefined;
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

  if (!guest && (!viewer || !workspaces || workspaces.length === 0)) {
    return <Spinner className="flex flex-1 items-center" />;
  }

  const sidebar = (
    <nav className="flex flex-col gap-0.5 p-3">
      <p className="flex items-center gap-2 px-3 pt-1 pb-4 text-[18px] font-bold tracking-[-0.02em] text-[#08263f]">
        <Image src="/logo-mark.png" alt="" width={77} height={77} className="size-7" />
        BiorefMind
      </p>
      {SIDEBAR_ITEMS.map((item, i) => (
        <button
          key={item}
          type="button"
          onClick={() => setMenuOpen(false)}
          className={
            i === 0
              ? "btn-navy rounded-xl px-3 py-2 text-left text-[15px] font-medium"
              : "rounded-xl px-3 py-2 text-left text-[15px] hover:bg-accent"
          }
        >
          {item}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-1 bg-grouped">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-white/70 bg-card/70 backdrop-blur md:block">{sidebar}</aside>
      {menuOpen ? (
        <div className="fixed inset-0 z-20 md:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/20" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-64 bg-background shadow-xl">{sidebar}</aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl">
          <div className="flex h-12 items-center justify-between px-4">
            <Button variant="link" onClick={() => setMenuOpen(true)} className="text-[17px] md:invisible">
              Menu
            </Button>
            {guest ? (
              <Button variant="link" onClick={() => router.push("/")} className="text-[17px]">
                Exit Guest
              </Button>
            ) : (
              <Button variant="link" onClick={signOut} className="text-[17px]">
                Sign Out
              </Button>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

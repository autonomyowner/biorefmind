"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { authMessages, type AuthMessages } from "@/components/auth-messages";
import { useMessages } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/backend";
import type { Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Password field with a show/hide toggle. */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  const t = useMessages(authMessages);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className={cn("pe-10", className)} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? t.hidePassword : t.showPassword}
        aria-pressed={shown}
        className="absolute top-1/2 end-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-black/40 transition-colors hover:bg-black/[0.05] hover:text-black/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** Readable text for a Better Auth error, in the visitor's language. */
export function authErrorMessage(
  error: { code?: string; message?: string; status?: number } | null | undefined,
  t: AuthMessages["errors"],
): string {
  const code = error?.code ?? "";
  if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_PASSWORD" || code === "USER_NOT_FOUND")
    return t.wrongLogin;
  if (code === "USER_ALREADY_EXISTS" || code.startsWith("USER_ALREADY_EXISTS"))
    return t.exists;
  if (code === "PASSWORD_TOO_SHORT") return t.passwordShort;
  if (code === "PASSWORD_TOO_LONG") return t.passwordLong;
  if (code === "INVALID_EMAIL") return t.email;
  if (error?.status === 429) return t.tooMany;
  return t.offline;
}

/**
 * Once Convex sees the session, sends the user to their dashboard, or to
 * onboarding when they have no workspace yet. A login without a profile (an
 * invited teammate signing in for the first time) gets one first:
 * `ensureUser` also accepts their pending invitations, so they land straight
 * in the workspace they were invited to. Renders nothing.
 */
export function PostAuthRedirect({ active }: { active: boolean }) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const ready = active && isAuthenticated;
  const viewer = useQuery(api.users.viewer, ready ? {} : "skip");
  const workspaces = useQuery(api.companies.mine, ready && viewer ? {} : "skip") as Workspace[] | undefined;
  const ensureUser = useMutation(api.users.ensureUser);
  const session = authClient.useSession();
  const loginName = session.data?.user.name?.trim();
  const creating = useRef(false);

  useEffect(() => {
    if (!ready || viewer !== null || creating.current) return;
    creating.current = true;
    // Without a name the onboarding form asks for one.
    if (!loginName) router.replace("/onboarding");
    else ensureUser({ name: loginName }).catch(() => router.replace("/onboarding"));
  }, [ready, viewer, loginName, ensureUser, router]);

  useEffect(() => {
    if (!active || workspaces === undefined) return;
    router.replace(workspaces.length === 0 ? "/onboarding" : "/dashboard");
  }, [active, workspaces, router]);

  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

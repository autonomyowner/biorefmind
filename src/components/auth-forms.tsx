"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { ArrowRight, Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { EMAIL_RE, PasswordInput, PostAuthRedirect, authErrorMessage } from "@/lib/auth-ui";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { authMessages } from "@/components/auth-messages";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import type { Workspace } from "@/lib/types";

/** Bare sign-in: email + password, then PostAuthRedirect picks the next page. */
export function LoginForm() {
  const t = useMessages(authMessages);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError(t.errors.email);
    if (!password) return setError(t.errors.password);
    setBusy(true);
    try {
      const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
      if (err) {
        setError(authErrorMessage(err, t.errors));
        setBusy(false);
        return;
      }
      setSignedIn(true);
    } catch {
      setError(t.errors.offline);
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title={t.signIn}
      lead={t.signInLead}
      footer={
        <>
          {t.noAccount} <FooterLink href="/signup">{t.signUp}</FooterLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <Input type="email" placeholder={t.email} aria-label={t.email} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
        <PasswordInput placeholder={t.password} aria-label={t.password} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
        <FormError error={error} />
        <SubmitButton busy={busy}>{t.continue}</SubmitButton>
      </form>
      <PostAuthRedirect active={signedIn} />
    </AuthCard>
  );
}

type Setup = { name: string; company: string };

/**
 * Sign-up (creates the login, then the workspace) and onboarding (a signed-in
 * login without a workspace creates one).
 */
export function WorkspaceForm({ mode }: { mode: "signup" | "onboarding" }) {
  const router = useRouter();
  const t = useMessages(authMessages);
  const locale = useLocale();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const createCompany = useMutation(api.companies.create);
  const workspaces = useQuery(api.companies.mine, mode === "onboarding" && isAuthenticated ? {} : "skip") as
    | Workspace[]
    | undefined;

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Setup | null>(null);
  const running = useRef(false);

  useEffect(() => {
    if (mode !== "onboarding" || isLoading) return;
    if (!isAuthenticated) router.replace("/login");
    else if (workspaces && workspaces.length > 0 && !pending) router.replace("/dashboard");
  }, [mode, isLoading, isAuthenticated, workspaces, pending, router]);

  useEffect(() => {
    if (!pending || !isAuthenticated || running.current) return;
    running.current = true;
    (async () => {
      try {
        await ensureUser({ name: pending.name });
        await createCompany({ name: pending.company, kind: "factory" });
        router.replace("/dashboard");
      } catch (e) {
        toast.error(localizeBackendError(errorMessage(e), locale));
        setPending(null);
        setBusy(false);
      } finally {
        running.current = false;
      }
    })();
  }, [pending, isAuthenticated, ensureUser, createCompany, router, locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const setup: Setup = { name: name.trim(), company: company.trim() };
    const needsLogin = mode === "signup" && !isAuthenticated;
    let problem: string | null = null;
    if (!setup.name) problem = t.errors.name;
    else if (setup.company.length < 2 || setup.company.length > 80) problem = t.errors.company;
    else if (needsLogin && !EMAIL_RE.test(email.trim())) problem = t.errors.email;
    else if (needsLogin && password.length < 8) problem = t.errors.passwordShort;
    setError(problem);
    if (problem) return;

    setBusy(true);
    if (needsLogin) {
      try {
        const { error: err } = await authClient.signUp.email({ name: setup.name, email: email.trim(), password });
        if (err) {
          setError(authErrorMessage(err, t.errors));
          setBusy(false);
          return;
        }
      } catch {
        setError(t.errors.offline);
        setBusy(false);
        return;
      }
    }
    setPending(setup);
  }

  if (mode === "onboarding" && (isLoading || !isAuthenticated)) {
    return <Spinner className="flex py-16" />;
  }

  return (
    <AuthCard
      title={mode === "signup" ? t.signUp : t.setUp}
      lead={mode === "signup" ? t.signUpLead : t.setUpLead}
      footer={
        mode === "signup" ? (
          <>
            {t.haveAccount} <FooterLink href="/login">{t.signIn}</FooterLink>
          </>
        ) : null
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <Input placeholder={t.name} aria-label={t.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
        <Input placeholder={t.company} aria-label={t.company} autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} className={FIELD} />
        {mode === "signup" && !isAuthenticated ? (
          <>
            <Input type="email" placeholder={t.email} aria-label={t.email} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
            <PasswordInput placeholder={t.password} aria-label={t.password} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
          </>
        ) : null}
        <FormError error={error} />
        <SubmitButton busy={busy}>{t.continue}</SubmitButton>
      </form>
      {mode === "signup" ? (
        <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
          {t.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-azure text-white">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
              {perk}
            </li>
          ))}
        </ul>
      ) : null}
    </AuthCard>
  );
}

/* ---------- Shared pieces of the sign-in pages ---------- */

// Taller, softer fields than the app default; the teal ring matches the brand.
const FIELD =
  "h-12 rounded-2xl border-foreground/10 bg-white/90 px-4 text-[15px] placeholder:text-foreground/40 focus-visible:border-azure/60 focus-visible:ring-azure/20";

function AuthCard({
  title,
  lead,
  footer,
  children,
}: {
  title: string;
  lead: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-center">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[40px]">{title}</h1>
        <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
          {lead}
        </p>
      </div>
      <div className="glass mt-7 rounded-[28px] p-5 sm:p-7">
        {children}
      </div>
      {footer ? <p className="mt-6 text-center text-[15px] text-muted-foreground">{footer}</p> : null}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-destructive/8 px-3.5 py-2.5 text-[13px] text-destructive">
      {error}
    </p>
  );
}

/** The site's glowing navy pill, arrow first; a spinner while busy. */
function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="btn-navy group !mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-full text-[17px] font-semibold transition-[filter] hover:brightness-125 disabled:opacity-80"
    >
      {busy ? (
        <Spinner size="sm" label={null} />
      ) : (
        <>
          <ArrowRight
            className="size-5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
            strokeWidth={2.25}
          />
          {children}
        </>
      )}
    </button>
  );
}

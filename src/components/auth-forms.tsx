"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { ArrowRight, Check, Factory, FlaskConical, Sprout, type LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { EMAIL_RE, PasswordInput, PostAuthRedirect, authErrorMessage } from "@/lib/auth-ui";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { authMessages } from "@/components/auth-messages";
import { CurrencySwitch, usePrice } from "@/components/currency";
import { LAB_PRICE_USD } from "@/lib/pricing";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { ANALYSIS_KEYS, RESIDUE_KEYS, catalogLabels, labelOf } from "@/lib/catalog-labels";
import type { Kind, Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";

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

type Setup = {
  kind: Kind;
  name: string;
  org: string;
  region: string;
  phone: string;
  services: string[];
  buys: string[];
};

const KIND_ICONS: Record<Kind, LucideIcon> = { farm: Sprout, lab: FlaskConical, factory: Factory };
const KINDS: Kind[] = ["farm", "lab", "factory"];

/** 7–20 digits once spaces, "+", "-" and brackets are removed (same rule as the server). */
function phoneOk(raw: string) {
  return /^\d{7,20}$/.test(raw.trim().replace(/[\s+\-()]/g, ""));
}

/**
 * Sign-up (creates the login, then the workspace) and onboarding (a signed-in
 * login without a workspace creates one). Step 1 picks farmer, lab or factory;
 * step 2 is that type's form.
 */
export function WorkspaceForm({ mode }: { mode: "signup" | "onboarding" }) {
  const router = useRouter();
  const t = useMessages(authMessages);
  const labels = useMessages(catalogLabels);
  const labPrice = usePrice(LAB_PRICE_USD);
  const locale = useLocale();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const createCompany = useMutation(api.companies.create);
  const workspaces = useQuery(api.companies.mine, mode === "onboarding" && isAuthenticated ? {} : "skip") as
    | Workspace[]
    | undefined;

  const [kind, setKind] = useState<Kind | null>(null);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [buys, setBuys] = useState<string[]>([]);
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
        await createCompany({
          kind: pending.kind,
          name: pending.org,
          region: pending.region,
          phone: pending.phone,
          services: pending.kind === "lab" ? pending.services : undefined,
          buys: pending.kind === "factory" ? pending.buys : undefined,
        });
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
    if (!kind) return;
    const setup: Setup = {
      kind,
      name: name.trim(),
      org: org.trim(),
      region: region.trim(),
      phone: phone.trim(),
      services,
      buys,
    };
    const needsLogin = mode === "signup" && !isAuthenticated;
    let problem: string | null = null;
    if (!setup.name) problem = t.errors.name;
    else if (setup.org.length < 2 || setup.org.length > 80) problem = t.errors.company;
    else if (setup.region.length < 2) problem = t.errors.region;
    else if (!phoneOk(setup.phone)) problem = t.errors.phone;
    else if (kind === "lab" && services.length === 0) problem = t.errors.services;
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

  const footer =
    mode === "signup" ? (
      <>
        {t.haveAccount} <FooterLink href="/login">{t.signIn}</FooterLink>
      </>
    ) : null;

  // Step 1: who are you?
  if (!kind) {
    return (
      <AuthCard title={mode === "signup" ? t.signUp : t.setUp} lead={mode === "signup" ? t.signUpLead : t.setUpLead} footer={footer}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-semibold">{t.chooseTitle}</p>
          <CurrencySwitch />
        </div>
        <ul className="space-y-3">
          {KINDS.map((k) => {
            const Icon = KIND_ICONS[k];
            const card = t.kinds[k];
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => setKind(k)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white bg-white/75 p-4 text-start shadow-[0_10px_24px_-20px_rgba(20,30,120,0.6)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-20px_rgba(40,60,170,0.6)] focus-visible:ring-2 focus-visible:ring-azure/40 focus-visible:outline-none"
                >
                  <span className="orb flex size-12 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold">{card.title}</span>
                    <span className="mt-0.5 block text-[14px] text-muted-foreground">{card.body}</span>
                    <span className="mt-1.5 inline-block rounded-full bg-[#e6edff] px-2.5 py-0.5 text-[12px] font-medium text-azure">
                      {card.price.replace("{price}", labPrice)}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                </button>
              </li>
            );
          })}
        </ul>
        {mode === "signup" ? <Perks perks={t.perks} /> : null}
      </AuthCard>
    );
  }

  // Step 2: that type's form.
  const Icon = KIND_ICONS[kind];
  return (
    <AuthCard title={mode === "signup" ? t.signUp : t.setUp} lead={t.kinds[kind].body} footer={footer}>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[#e6edff]/70 px-3 py-2.5">
        <span className="orb flex size-9 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
        <span className="flex-1 text-[15px] font-semibold">{t.kinds[kind].title}</span>
        <button
          type="button"
          onClick={() => {
            setKind(null);
            setError(null);
          }}
          className="text-[14px] font-medium text-azure underline-offset-4 hover:underline"
        >
          {t.change}
        </button>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <Input placeholder={t.name} aria-label={t.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
        <Input placeholder={t.orgName[kind]} aria-label={t.orgName[kind]} autoComplete="organization" value={org} onChange={(e) => setOrg(e.target.value)} className={FIELD} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          <Input placeholder={t.region} aria-label={t.region} autoComplete="address-level1" value={region} onChange={(e) => setRegion(e.target.value)} className={FIELD} />
          <Input type="tel" dir="ltr" placeholder={t.phone} aria-label={t.phone} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={cn(FIELD, "rtl:text-end")} />
        </div>
        {kind === "lab" ? (
          <ChipPicker label={t.servicesLabel} keys={ANALYSIS_KEYS} names={labels.analyses} value={services} onChange={setServices} />
        ) : null}
        {kind === "factory" ? (
          <ChipPicker label={t.buysLabel} keys={RESIDUE_KEYS} names={labels.residues} value={buys} onChange={setBuys} />
        ) : null}
        {mode === "signup" && !isAuthenticated ? (
          <>
            <Input type="email" placeholder={t.email} aria-label={t.email} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
            <PasswordInput placeholder={t.password} aria-label={t.password} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
          </>
        ) : null}
        <FormError error={error} />
        <SubmitButton busy={busy}>{t.continue}</SubmitButton>
      </form>
    </AuthCard>
  );
}

/** Toggle chips for a fixed list (analyses or residues). */
function ChipPicker({
  label,
  keys,
  names,
  value,
  onChange,
}: {
  label: string;
  keys: readonly string[];
  names: Record<string, string>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset className="pt-1">
      <legend className="mb-2 text-[14px] font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => {
          const on = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== k) : [...value, k])}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                on ? "border-transparent bg-azure text-white" : "border-foreground/15 bg-white/80 hover:border-azure/50",
              )}
            >
              {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
              {labelOf(names, k)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Perks({ perks }: { perks: readonly string[] }) {
  return (
    <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
      {perks.map((perk) => (
        <li key={perk} className="flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center rounded-full bg-azure text-white">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          {perk}
        </li>
      ))}
    </ul>
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

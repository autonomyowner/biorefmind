# Three account types — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People join BiorefMind as a farmer, a lab or a factory, each with its own sign-up, profile and dashboard home; labs get a 14-day trial and an admin can mark them paid; factories can request enterprise pricing.

**Architecture:** Every account stays a `companies` workspace, now with kind `farm | lab | factory` plus profile fields. Pure rules (`lab listed?`, `is admin?`, phone/name checks) live in `convex/lib/accounts.ts` and are unit-tested; Convex functions in `companies.ts`, `labs.ts`, `enterprise.ts`, `admin.ts` enforce them on the server. The website reads them through `api` and renders a per-kind dashboard in English or Arabic.

**Tech Stack:** Convex + convex-test + vitest, Better Auth, Next.js 16 App Router, React 19, Tailwind 4, Base UI/shadcn.

**Design:** `docs/superpowers/specs/2026-10-02-three-account-types-design.md`.

**Branch:** `three-account-types`.

---

## File map
| File | Responsibility |
|---|---|
| `convex/lib/catalog.ts` (new) | Fixed lists: analyses labs offer, residues factories buy |
| `convex/lib/accounts.ts` (new) | Pure rules and refusal texts: `labListed`, `isAdmin`, `cleanName`, `cleanRegion`, `cleanPhone`, `pickKnown`, `LAB_TRIAL_MS`, `REFUSE` |
| `convex/lib/accounts.test.ts` (new) | Unit tests for the rules |
| `convex/schema.ts` | `companies` gains `farm`, profile fields, new plans, `by_kind` index; new `enterpriseRequests` table |
| `convex/companies.ts` | `create` / `mine` / `updateProfile` per kind; farm invite refusal |
| `convex/labs.ts` (new) | `directory` |
| `convex/enterprise.ts` (new) | `request` |
| `convex/admin.ts` (new) | `overview`, `setLabPaidUntil` |
| `convex/users.ts` | `viewer` adds `isAdmin` |
| `convex/accounts.test.ts` (new) | Backend tests for all of the above |
| `convex/backend.test.ts` | Helper and two assertions updated for the new `create` |
| `src/lib/types.ts` | `Workspace`, `Viewer`, `DirectoryLab`, `AdminOverview` |
| `src/lib/catalog-labels.ts` (new) | English/Arabic labels for catalog keys |
| `src/i18n/backend-errors.ts` | Arabic for every new refusal |
| `src/components/auth-forms.tsx`, `src/components/auth-messages.ts` | Type chooser + per-type sign-up/onboarding |
| `src/components/dashboard/*` (new) | Messages, shell, per-kind homes, lab directory, profile editor |
| `src/components/dashboard-shell.tsx` | Replaced by `src/components/dashboard/shell.tsx` |
| `src/app/dashboard/layout.tsx`, `page.tsx` | Bilingual, per-kind home |
| `src/app/admin/layout.tsx`, `page.tsx`, `src/components/admin/admin-page.tsx` (new) | Admin page |
| `src/components/landing/messages.ts`, `src/app/page.tsx`, `src/components/landing/site-header.tsx` | Three types, new pricing, FAQ |

---

## Part 1 — core, test-first

### Task 1: catalog and account rules

**Files:** Create `convex/lib/catalog.ts`, `convex/lib/accounts.ts`, `convex/lib/accounts.test.ts`.

- [ ] **Step 1: Write the failing test** — `convex/lib/accounts.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanName, cleanPhone, cleanRegion, isAdmin, labListed, pickKnown, REFUSE } from "./accounts";
import { ANALYSES } from "./catalog";

const NOW = 1_800_000_000_000;

describe("labListed", () => {
  test("trial running, trial over, paid, paid expired, not a lab", () => {
    expect(labListed({ kind: "lab", plan: "lab_trial", trialEndsAt: NOW + 1 }, NOW)).toBe(true);
    expect(labListed({ kind: "lab", plan: "lab_trial", trialEndsAt: NOW - 1 }, NOW)).toBe(false);
    expect(labListed({ kind: "lab", plan: "lab_paid", paidUntil: NOW + 1 }, NOW)).toBe(true);
    expect(labListed({ kind: "lab", plan: "lab_paid", paidUntil: NOW - 1 }, NOW)).toBe(false);
    expect(labListed({ kind: "factory", plan: "enterprise" }, NOW)).toBe(false);
  });
});

describe("isAdmin", () => {
  afterEach(() => vi.unstubAllEnvs());
  test("unset list means nobody", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdmin("a@b.dz")).toBe(false);
  });
  test("case and spaces are ignored", () => {
    vi.stubEnv("ADMIN_EMAILS", " Boss@BiorefMind.com , other@x.dz ");
    expect(isAdmin("boss@biorefmind.com")).toBe(true);
    expect(isAdmin("OTHER@x.dz")).toBe(true);
    expect(isAdmin("nobody@x.dz")).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});

describe("field checks", () => {
  test("name, region, phone", () => {
    expect(cleanName("  Ferme Saïd ")).toBe("Ferme Saïd");
    expect(() => cleanName("A")).toThrow(REFUSE.name);
    expect(cleanRegion(" Sétif ")).toBe("Sétif");
    expect(() => cleanRegion("  ")).toThrow(REFUSE.region);
    expect(cleanPhone(" +213 555-12-34-56 ")).toBe("+213 555-12-34-56");
    expect(() => cleanPhone("12 34")).toThrow(REFUSE.phone);
    expect(() => cleanPhone("call me")).toThrow(REFUSE.phone);
  });
  test("pickKnown keeps known keys once, in catalog order", () => {
    expect(pickKnown(["mold", "nope", "moisture", "mold"], ANALYSES)).toEqual(["moisture", "mold"]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** — `npx vitest run convex/lib/accounts.test.ts` → "Failed to resolve import ./accounts".

- [ ] **Step 3: Implement** — `convex/lib/catalog.ts`:

```ts
/** Analyses a lab can offer. Keys are stored; labels live in the website (src/lib/catalog-labels.ts). */
export const ANALYSES = ["moisture", "polyphenols", "punicalagin", "mold", "oxidation", "contamination"] as const;
/** Residues a factory can say it buys. */
export const RESIDUES = [
  "pomegranate_peels",
  "citrus_peels",
  "olive_pomace",
  "tomato_skins_seeds",
  "grape_marc",
  "date_pits",
  "corn_silk",
] as const;
export type Analysis = (typeof ANALYSES)[number];
export type Residue = (typeof RESIDUES)[number];
```

`convex/lib/accounts.ts`:

```ts
import { ConvexError } from "convex/values";

export const LAB_TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

/** Every refusal of the account functions, word for word (the website translates them). */
export const REFUSE = {
  name: "Name must be 2–80 characters.",
  region: "Please enter your region.",
  phone: "Please enter a phone number.",
  services: "Choose at least one analysis your lab offers.",
  oneFarm: "You already have a farm account.",
  farmInvite: "Farm accounts are for one person.",
  admin: "Only BiorefMind admins can do this.",
  notLab: "That account is not a lab.",
  enterpriseKind: "Only factory accounts can request enterprise pricing.",
  enterpriseMessage: "Please write a short message (up to 1000 characters).",
} as const;

type Listable = { kind: string; plan: string; trialEndsAt?: number; paidUntil?: number };

/** A lab shows in the directory while its trial runs or its paid period lasts. */
export function labListed(c: Listable, now: number): boolean {
  if (c.kind !== "lab") return false;
  if (c.plan === "lab_paid") return (c.paidUntil ?? 0) > now;
  if (c.plan === "lab_trial") return (c.trialEndsAt ?? 0) > now;
  return false;
}

/** Admins are the emails in the Convex env var ADMIN_EMAILS (comma-separated). Unset → nobody. */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export function cleanName(raw: string): string {
  const s = raw.trim();
  if (s.length < 2 || s.length > 80) throw new ConvexError(REFUSE.name);
  return s;
}

export function cleanRegion(raw: string): string {
  const s = raw.trim();
  if (s.length < 2 || s.length > 80) throw new ConvexError(REFUSE.region);
  return s;
}

/** 7–20 digits once spaces, "+", "-" and brackets are removed; stored as typed (trimmed). */
export function cleanPhone(raw: string): string {
  const s = raw.trim();
  const digits = s.replace(/[\s+\-()]/g, "");
  if (!/^\d{7,20}$/.test(digits) || s.length > 30) throw new ConvexError(REFUSE.phone);
  return s;
}

/** Only keys from `catalog`, each once, in catalog order. */
export function pickKnown<T extends string>(keys: readonly string[], catalog: readonly T[]): T[] {
  const wanted = new Set(keys);
  return catalog.filter((k) => wanted.has(k));
}
```

- [ ] **Step 4: Run it, expect PASS** — `npx vitest run convex/lib/accounts.test.ts`.
- [ ] **Step 5: Commit** — `Account rules: lab listing, admin list, field checks`.

### Task 2: schema and companies per kind

**Files:** Modify `convex/schema.ts`, `convex/companies.ts`, `convex/backend.test.ts`; create `convex/accounts.test.ts`.

- [ ] **Step 1: Write the failing tests** — `convex/accounts.test.ts` (shares the harness of `backend.test.ts`):

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { api, components } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
beforeAll(async () => {
  await Promise.all(
    Object.entries(modules)
      .filter(([p]) => !p.endsWith("convex.config.ts") && !p.includes("_generated/") && !p.includes(".test."))
      .map(([, load]) => load()),
  );
}, 180_000);

function newBackend() {
  const t = convexTest(schema, modules);
  betterAuthTest.register(t);
  return t;
}
type Backend = ReturnType<typeof newBackend>;

async function member(t: Backend, email: string, name = "Test User") {
  const now = Date.now();
  const { userId, sessionId } = await t.run(async (ctx) => {
    const u = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: { model: "user", data: { name, email, emailVerified: true, createdAt: now, updatedAt: now } },
    });
    const s = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: { model: "session", data: { token: `t-${email}`, userId: u._id, expiresAt: now + 3_600_000, createdAt: now, updatedAt: now } },
    });
    return { userId: u._id as string, sessionId: s._id as string };
  });
  const as = t.withIdentity({ subject: userId, sessionId, email });
  await as.mutation(api.users.ensureUser, { name });
  return as;
}

const base = { region: "Sétif", phone: "+213 555 12 34 56" };

describe("companies per kind", () => {
  test("farm, lab and factory get their plan and fields", async () => {
    const t = newBackend();
    const farmer = await member(t, "farmer@x.dz");
    await farmer.mutation(api.companies.create, { kind: "farm", name: "Ferme Saïd", ...base });
    const lab = await member(t, "lab@x.dz");
    await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold", "zzz", "moisture"] });
    const factory = await member(t, "f@x.dz");
    await factory.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", ...base, buys: ["olive_pomace"] });

    expect((await farmer.query(api.companies.mine, {}))[0]).toMatchObject({ kind: "farm", plan: "free", region: "Sétif", phone: base.phone });
    const l = (await lab.query(api.companies.mine, {}))[0];
    expect(l).toMatchObject({ kind: "lab", plan: "lab_trial", services: ["moisture", "mold"], listed: true });
    expect(l.trialEndsAt! - Date.now()).toBeGreaterThan(13.9 * 86_400_000);
    expect((await factory.query(api.companies.mine, {}))[0]).toMatchObject({ kind: "factory", plan: "enterprise", buys: ["olive_pomace"] });
  });

  test("refusals", async () => {
    const t = newBackend();
    const as = await member(t, "a@x.dz");
    await expect(as.mutation(api.companies.create, { kind: "farm", name: "A", ...base })).rejects.toThrow("Name must be 2–80 characters.");
    await expect(as.mutation(api.companies.create, { kind: "farm", name: "Ferme", region: " ", phone: base.phone })).rejects.toThrow("Please enter your region.");
    await expect(as.mutation(api.companies.create, { kind: "farm", name: "Ferme", region: "Sétif", phone: "123" })).rejects.toThrow("Please enter a phone number.");
    await expect(as.mutation(api.companies.create, { kind: "lab", name: "Labo", ...base, services: ["nope"] })).rejects.toThrow("Choose at least one analysis your lab offers.");
    await as.mutation(api.companies.create, { kind: "farm", name: "Ferme", ...base });
    await expect(as.mutation(api.companies.create, { kind: "farm", name: "Ferme 2", ...base })).rejects.toThrow("You already have a farm account.");
    const [farm] = await as.query(api.companies.mine, {});
    await expect(as.mutation(api.companies.invite, { companyId: farm.companyId, email: "b@x.dz", role: "manager" })).rejects.toThrow("Farm accounts are for one person.");
  });

  test("updateProfile checks fields and roles", async () => {
    const t = newBackend();
    const lab = await member(t, "lab@x.dz");
    const id = await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold"] });
    await lab.mutation(api.companies.updateProfile, { companyId: id, name: "Labo Nour Sétif", services: ["moisture"] });
    expect((await lab.query(api.companies.mine, {}))[0]).toMatchObject({ name: "Labo Nour Sétif", services: ["moisture"] });
    await expect(lab.mutation(api.companies.updateProfile, { companyId: id, services: [] })).rejects.toThrow("Choose at least one analysis your lab offers.");
    const other = await member(t, "o@x.dz");
    await expect(other.mutation(api.companies.updateProfile, { companyId: id, name: "Hijack" })).rejects.toThrow("You don't have access to this workspace.");
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run convex/accounts.test.ts` → validator errors on `region`/`phone` and missing `updateProfile`.

- [ ] **Step 3: Schema** — in `convex/schema.ts` replace the `companies` table:

```ts
  /** One workspace per farm, lab or factory. Profile fields are optional in storage (old rows) but required by companies.create. */
  companies: defineTable({
    name: v.string(),
    kind: v.union(v.literal("farm"), v.literal("lab"), v.literal("factory")),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    phone: v.optional(v.string()),
    services: v.optional(v.array(v.string())), // labs: keys from lib/catalog ANALYSES
    buys: v.optional(v.array(v.string())), // factories: keys from lib/catalog RESIDUES
    ownerId: v.id("users"),
    // free: farms · lab_trial / lab_paid: labs · enterprise: factories · trial/tier1/tier2: before 2026-10-02
    plan: v.union(
      v.literal("free"),
      v.literal("lab_trial"),
      v.literal("lab_paid"),
      v.literal("enterprise"),
      v.literal("trial"),
      v.literal("tier1"),
      v.literal("tier2"),
    ),
    trialEndsAt: v.optional(v.number()),
    paidUntil: v.optional(v.number()),
    shipmentSeq: v.number(), // last number used for shipment codes
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_kind", ["kind"]),

  /** A factory asking for enterprise pricing; read on the admin page. */
  enterpriseRequests: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
```

- [ ] **Step 4: companies.ts** — replace `mine` and `create`, add `updateProfile`, and refuse invites into farms:

```ts
import { ANALYSES, RESIDUES } from "./lib/catalog";
import { cleanName, cleanPhone, cleanRegion, LAB_TRIAL_MS, labListed, pickKnown, REFUSE } from "./lib/accounts";

const kind = v.union(v.literal("farm"), v.literal("lab"), v.literal("factory"));

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAppUser(ctx);
    if (!user) return [];
    const memberships = await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    const now = Date.now();
    const out = [];
    for (const m of memberships) {
      const c = await ctx.db.get(m.companyId);
      if (!c) continue;
      out.push({
        companyId: c._id, name: c.name, kind: c.kind, role: m.role,
        region: c.region ?? "", phone: c.phone ?? "", services: c.services, buys: c.buys,
        plan: c.plan, trialEndsAt: c.trialEndsAt, paidUntil: c.paidUntil,
        listed: c.kind === "lab" ? labListed(c, now) : undefined,
      });
    }
    return out;
  },
});

export const create = mutation({
  args: { kind, name: v.string(), region: v.string(), phone: v.string(), services: v.optional(v.array(v.string())), buys: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const user = await getAppUser(ctx);
    if (!user) {
      const identity = await ctx.auth.getUserIdentity();
      throw new ConvexError(identity ? "Please finish creating your account first." : SIGN_IN);
    }
    const name = cleanName(args.name);
    const region = cleanRegion(args.region);
    const phone = cleanPhone(args.phone);
    const services = args.kind === "lab" ? pickKnown(args.services ?? [], ANALYSES) : undefined;
    if (args.kind === "lab" && services!.length === 0) throw new ConvexError(REFUSE.services);
    const buys = args.kind === "factory" ? pickKnown(args.buys ?? [], RESIDUES) : undefined;
    if (args.kind === "farm") {
      const owned = await ctx.db.query("companies").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
      if (owned.some((c) => c.kind === "farm")) throw new ConvexError(REFUSE.oneFarm);
    }
    const now = Date.now();
    const companyId = await ctx.db.insert("companies", {
      name, kind: args.kind, region, phone, services, buys, ownerId: user._id,
      plan: args.kind === "farm" ? "free" : args.kind === "lab" ? "lab_trial" : "enterprise",
      trialEndsAt: args.kind === "lab" ? now + LAB_TRIAL_MS : undefined,
      shipmentSeq: 0, createdAt: now,
    });
    await ctx.db.insert("memberships", { companyId, userId: user._id, role: "owner", createdAt: now });
    return companyId;
  },
});

export const updateProfile = mutation({
  args: { companyId: v.id("companies"), name: v.optional(v.string()), region: v.optional(v.string()), phone: v.optional(v.string()), services: v.optional(v.array(v.string())), buys: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const { company } = await requireMember(ctx, args.companyId, "manager");
    const patch: Partial<Doc<"companies">> = {};
    if (args.name !== undefined) patch.name = cleanName(args.name);
    if (args.region !== undefined) patch.region = cleanRegion(args.region);
    if (args.phone !== undefined) patch.phone = cleanPhone(args.phone);
    if (args.services !== undefined && company.kind === "lab") {
      patch.services = pickKnown(args.services, ANALYSES);
      if (patch.services.length === 0) throw new ConvexError(REFUSE.services);
    }
    if (args.buys !== undefined && company.kind === "factory") patch.buys = pickKnown(args.buys, RESIDUES);
    await ctx.db.patch(args.companyId, patch);
    return null;
  },
});
```

In `invite`, after `requireMember(…)`: `const { user, company } = …; if (company.kind === "farm") throw new ConvexError(REFUSE.farmInvite);`. The old `TRIAL_MS` constant goes.

- [ ] **Step 5: Update `convex/backend.test.ts`** — `ownerWithCompany` passes `region: "Sétif", phone: "0555123456"`; the first companies test expects `plan: "enterprise"` and drops the trial assertion; the refusal test passes region/phone and expects `"Name must be 2–80 characters."`.

- [ ] **Step 6: Run all tests, expect PASS** — `npm test` (33 old + new). Then `npm run typecheck:convex`.
- [ ] **Step 7: Commit** — `Companies per kind: farm, lab, factory with profile, plans and checks`.

### Task 3: lab directory, enterprise requests, admin

**Files:** Create `convex/labs.ts`, `convex/enterprise.ts`, `convex/admin.ts`; modify `convex/users.ts`; extend `convex/accounts.test.ts`.

- [ ] **Step 1: Add failing tests** to `convex/accounts.test.ts`:

```ts
describe("directory, enterprise, admin", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("directory lists labs in trial or paid, filters by analysis", async () => {
    const t = newBackend();
    const lab = await member(t, "lab@x.dz");
    const labId = await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold"] });
    const viewer = await member(t, "v@x.dz");
    expect(await viewer.query(api.labs.directory, {})).toMatchObject([{ companyId: labId, name: "Labo Nour", services: ["mold"] }]);
    expect(await viewer.query(api.labs.directory, { service: "moisture" })).toEqual([]);
    await t.run(async (ctx) => ctx.db.patch(labId, { trialEndsAt: Date.now() - 1 }));
    expect(await viewer.query(api.labs.directory, {})).toEqual([]);
    await expect(t.query(api.labs.directory, {})).rejects.toThrow("Please sign in to continue.");
  });

  test("enterprise request: factories only, message checked", async () => {
    const t = newBackend();
    const f = await member(t, "f@x.dz");
    const fid = await f.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", ...base });
    await expect(f.mutation(api.enterprise.request, { companyId: fid, message: "  " })).rejects.toThrow("Please write a short message (up to 1000 characters).");
    await f.mutation(api.enterprise.request, { companyId: fid, message: "We buy 40 t a month." });
    const farmer = await member(t, "farmer@x.dz");
    const farm = await farmer.mutation(api.companies.create, { kind: "farm", name: "Ferme", ...base });
    await expect(farmer.mutation(api.enterprise.request, { companyId: farm, message: "Hi" })).rejects.toThrow("Only factory accounts can request enterprise pricing.");
  });

  test("admin: refused for others, overview and mark paid for admins", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@biorefmind.com");
    const t = newBackend();
    const lab = await member(t, "lab@x.dz");
    const labId = await lab.mutation(api.companies.create, { kind: "lab", name: "Labo Nour", ...base, services: ["mold"] });
    await expect(lab.query(api.admin.overview, {})).rejects.toThrow("Only BiorefMind admins can do this.");
    expect(await lab.query(api.users.viewer, {})).toMatchObject({ isAdmin: false });

    const boss = await member(t, "Boss@BiorefMind.com");
    expect(await boss.query(api.users.viewer, {})).toMatchObject({ isAdmin: true });
    const o = await boss.query(api.admin.overview, {});
    expect(o.accounts).toMatchObject([{ companyId: labId, kind: "lab", ownerEmail: "lab@x.dz", listed: true }]);

    await t.run(async (ctx) => ctx.db.patch(labId, { trialEndsAt: Date.now() - 1 }));
    const until = Date.now() + 30 * 86_400_000;
    await boss.mutation(api.admin.setLabPaidUntil, { companyId: labId, paidUntil: until });
    expect((await lab.query(api.companies.mine, {}))[0]).toMatchObject({ plan: "lab_paid", paidUntil: until, listed: true });

    const f = await member(t, "f@x.dz");
    const fid = await f.mutation(api.companies.create, { kind: "factory", name: "Peel Factory", ...base });
    await expect(boss.mutation(api.admin.setLabPaidUntil, { companyId: fid, paidUntil: until })).rejects.toThrow("That account is not a lab.");
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `api.labs` undefined.

- [ ] **Step 3: Implement.**

`convex/labs.ts`:

```ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/access";
import { labListed } from "./lib/accounts";

/** Labs open to work: trial running or paid. Signed-in users only (phone numbers are shown). */
export const directory = query({
  args: { service: v.optional(v.string()) },
  handler: async (ctx, { service }) => {
    await requireUser(ctx);
    const now = Date.now();
    const labs = await ctx.db.query("companies").withIndex("by_kind", (q) => q.eq("kind", "lab")).collect();
    return labs
      .filter((c) => labListed(c, now) && (!service || (c.services ?? []).includes(service)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100)
      .map((c) => ({ companyId: c._id, name: c.name, region: c.region ?? "", phone: c.phone ?? "", services: c.services ?? [] }));
  },
});
```

`convex/enterprise.ts`:

```ts
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireMember } from "./lib/access";
import { REFUSE } from "./lib/accounts";

export const request = mutation({
  args: { companyId: v.id("companies"), message: v.string() },
  handler: async (ctx, { companyId, message }) => {
    const { user, company } = await requireMember(ctx, companyId);
    if (company.kind !== "factory") throw new ConvexError(REFUSE.enterpriseKind);
    const text = message.trim();
    if (text.length < 1 || text.length > 1000) throw new ConvexError(REFUSE.enterpriseMessage);
    await ctx.db.insert("enterpriseRequests", { companyId, userId: user._id, message: text, createdAt: Date.now() });
    return null;
  },
});
```

`convex/admin.ts`:

```ts
import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/access";
import { isAdmin, labListed, REFUSE } from "./lib/accounts";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (!isAdmin(user.email)) throw new ConvexError(REFUSE.admin);
  return user;
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const companies = await ctx.db.query("companies").order("desc").take(500);
    const accounts = [];
    for (const c of companies) {
      const owner = await ctx.db.get(c.ownerId);
      accounts.push({
        companyId: c._id, name: c.name, kind: c.kind, ownerEmail: owner?.email ?? "",
        region: c.region ?? "", phone: c.phone ?? "", plan: c.plan,
        trialEndsAt: c.trialEndsAt, paidUntil: c.paidUntil,
        listed: c.kind === "lab" ? labListed(c, now) : undefined, createdAt: c.createdAt,
      });
    }
    const rows = await ctx.db.query("enterpriseRequests").withIndex("by_created").order("desc").take(100);
    const requests = [];
    for (const r of rows) {
      const [company, user] = await Promise.all([ctx.db.get(r.companyId), ctx.db.get(r.userId)]);
      requests.push({ _id: r._id, company: company?.name ?? "", email: user?.email ?? "", phone: company?.phone ?? "", message: r.message, createdAt: r.createdAt });
    }
    return { accounts, requests };
  },
});

export const setLabPaidUntil = mutation({
  args: { companyId: v.id("companies"), paidUntil: v.number() },
  handler: async (ctx, { companyId, paidUntil }) => {
    await requireAdmin(ctx);
    const company = await ctx.db.get(companyId);
    if (!company || company.kind !== "lab") throw new ConvexError(REFUSE.notLab);
    await ctx.db.patch(companyId, { plan: "lab_paid", paidUntil });
    return null;
  },
});
```

`convex/users.ts` `viewer` returns `{ _id, email, name, isAdmin: isAdmin(user.email) }` (import from `./lib/accounts`); update the `backend.test.ts` viewer assertion to include `isAdmin: false`.

- [ ] **Step 4: Run `npm test`, `npm run typecheck:convex`, expect PASS.**
- [ ] **Step 5: Commit** — `Lab directory, enterprise requests and admin functions`.

### Task 4: client contract

**Files:** `src/lib/types.ts`, `src/i18n/backend-errors.ts`, `src/lib/catalog-labels.ts`, `docs/superpowers/contracts/accounts.md`.

- [ ] `types.ts`: `Kind = "farm" | "lab" | "factory"`; `Plan = "free" | "lab_trial" | "lab_paid" | "enterprise" | "trial" | "tier1" | "tier2"`; `Workspace = { companyId; name; kind: Kind; role; region; phone; services?: string[]; buys?: string[]; plan: Plan; trialEndsAt?: number; paidUntil?: number; listed?: boolean }`; `Viewer` adds `isAdmin: boolean`; `DirectoryLab = { companyId; name; region; phone; services: string[] }`; `AdminOverview` as returned by `admin.overview`.
- [ ] `backend-errors.ts`: Arabic for all ten `REFUSE` texts and `"Name must be 2–80 characters."` (replacing the old company-name entry).
- [ ] `catalog-labels.ts`: `defineMessages` with English/Arabic labels for every `ANALYSES` and `RESIDUES` key.
- [ ] Contract doc: the function table from the design, with the real `SIGN_IN` text.
- [ ] Run `npm run typecheck`; commit `Client contract for account types`.

## Part 2 — website

### Task 5: sign-up and onboarding per type
**Files:** `src/components/auth-forms.tsx`, `src/components/auth-messages.ts`.
- Step 1 of `WorkspaceForm`: three cards (Farmer · Lab · Factory) with a one-line "what you get · what it costs" (`Free — buyers pay the 5% fee`, `$30/month after a 14-day free trial`, `Custom pricing`). Choosing one shows step 2 with a "Change" link.
- Step 2 fields: your name; farm / lab / company name; region; phone; lab: analysis checkboxes (`ANALYSES`); factory: "What do you buy?" checkboxes (`RESIDUES`); `/signup` adds email + password.
- Client checks mirror the server (same messages) before calling; after sign-up, `ensureUser` then `companies.create({ kind, name, region, phone, services|buys })`, then `/dashboard`.
- Perks under the form: `["Free for farmers", "14-day free trial for labs", "Every batch scored"]` (Arabic alongside).
- Commit `Sign-up and onboarding for farmers, labs and factories`.

### Task 6: dashboards per type
**Files:** create `src/components/dashboard/{messages.ts,shell.tsx,farm-home.tsx,lab-home.tsx,factory-home.tsx,lab-directory.tsx,profile-card.tsx}`; modify `src/app/dashboard/layout.tsx` (locale from the cookie, `lang`/`dir`, no forced English), `src/app/dashboard/page.tsx`; delete `src/components/dashboard-shell.tsx` (via `git rm`).
- Shell: sidebar with the logo and the kind's sections (farm: Home, My listings · lab: Home, Requests · factory: Home, Browse residues, Labs); "Admin" link when `viewer.isAdmin`; sign-out; language switch; same auth/onboarding redirects as today.
- `ProfileCard`: name, kind badge, region, phone, analyses/residues as chips; "Edit" opens a dialog calling `companies.updateProfile` (owners/managers).
- `LabDirectory`: `labs.directory` with a filter chip row of analyses; cards with name, region, phone (`tel:` link), analyses; empty state "No labs listed yet."
- `FarmHome`: ProfileCard; "My listings" empty state "Listing opens soon"; note "Free for farmers: buyers pay the 5% platform fee"; "Labs near you" (LabDirectory).
- `LabHome`: ProfileCard titled "Your public profile"; plan status ("Free trial: N days left" / "Paid until {date}" / "Hidden: your trial ended. Contact BiorefMind to activate."); "Requests" empty state "Analysis requests will appear here."
- `FactoryHome`: "Browse residues" empty state "Listings open soon"; LabDirectory; "Enterprise pricing" card with a textarea → `enterprise.request` → toast "Thanks, we'll contact you."
- Guest preview (`?guest=1`): FarmHome with sample data, no backend calls.
- English + Arabic for everything in `dashboard/messages.ts`.
- Commit `Dashboards for farmers, labs and factories`.

### Task 7: admin page
**Files:** create `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/components/admin/admin-page.tsx`.
- Client page; while loading a spinner; non-admins and signed-out visitors see "Page not found".
- Table: type, name, owner email, region, phone, plan status, created; labs get a date input + "Mark paid" calling `admin.setLabPaidUntil` (end of the chosen day). Enterprise requests listed below. English, LTR.
- Commit `Admin page: accounts, lab payments, enterprise requests`.

### Task 8: landing page
**Files:** `src/components/landing/messages.ts`, `src/app/page.tsx`, `src/components/landing/site-header.tsx`.
- Nav "Marketplaces" menu: Farmers (sell residues), Labs (list your analyses), Factories (buy raw material).
- Marketplace section: farmers list (left) and factories list (right, buying points), plus a labs banner under the hub ("$30/month · 14-day free trial"); no "Factories → Factories".
- Pricing: Farmers Free · Labs $30/month (featured) · Factories Custom; the "draft pricing" note goes.
- FAQ: who can sell (farmers), how deals close (agreed on BiorefMind, paid directly, factory pays 5% fee), what labs pay.
- Commit `Landing: three account types and the new pricing`.

## Part 3 — integration and verification
- [ ] `npm test`, `npm run typecheck`, `npm run typecheck:convex`, `npm run lint`, `npm run build`.
- [ ] Push functions to the dev deployment (`npx convex dev --once`), set dev `ADMIN_EMAILS`.
- [ ] Real Chrome (playwright-core): sign up as farmer (EN), lab (EN), factory (EN), farmer (AR); each dashboard home; enterprise request; admin marks the lab paid; directory shows it; 360 px no sideways scroll; no console errors.
- [ ] Update `CLAUDE.md` (status, admin env var, open questions) and memory; merge `--no-ff` into `main`; push.

## Summary
We will add farmer, lab and factory accounts with their own sign-up and home screen.
Labs get a two-week trial, factories can ask for a custom price, and you get an admin page.
We test everything on the backend first, then in a real browser, before merging.

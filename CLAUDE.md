# CLAUDE.md — BiorefMind Platform

BiorefMind is a second version of the BioGrena platform (`D:\biogrenaplatform`, branch `blank-skeleton` @ `355cf0d`) with a new brand and a new look. Same product: a **bio-waste marketplace** where farmers and factories sell peels, pomace and residues to factories that need them, and every batch gets a 0–100 quality score and a route (A pharmaceutical / B food-grade / C recovery). Inspectors override routes with a logged reason; teams get analytics, an AI assistant and PDF reports. **Never modify the BioGrena project** — this repo is a separate copy.

- Theme design: `docs/superpowers/specs/2026-10-01-biorefmind-theme-design.md`
- Inherited from BioGrena (still accurate for the backend; brand names in them are BioGrena's): `docs/superpowers/specs/2026-09-28-phase-1-platform-design.md`, `docs/superpowers/contracts/phase-1-backend.md`
- Owner's theme references (untracked, at the repo root): `theme.png` (the target landing look), `herohandandlogo.png` (hero photo source).

## Business model (from BioGrena, 2026-09-30)
1. **Farmers → Factories:** farmers and cooperatives list crop residues and factories buy them.
2. **Factories → Factories:** plants sell by-products to factories that make extracts, pectin, packaging or energy.
Draft pricing (not confirmed): free for farmers, 5% commission per sale (placeholder), optional "Factory Pro" monthly plan.

## Stack
Next.js 16.3 App Router, React 19.2, TypeScript, Tailwind 4, shadcn `base-nova` over Base UI (`src/components/ui/`), `motion`, ECharts, sonner, Convex + Better Auth (`@convex-dev/better-auth`). This Next version differs from training data: read `node_modules/next/dist/docs/` before writing Next code; `params`, `searchParams`, `cookies()` are async.

- Auth: Better Auth runs inside Convex (`convex/auth.ts`, `convex/http.ts`); the site proxies it at `/api/auth/*` so the cookie is first-party. The browser client (`src/lib/auth-client.ts`) has no `baseURL` on purpose. App profiles live in `users`, linked by lowercase email.
- Clients call Convex through `api` in `src/lib/backend.ts` and type results with `src/lib/types.ts`.
- **Theme (2026-10-01, from `theme.png`):** ice-blue background `#d9e7f3`, navy ink `#071733`, navy primary `#04173a`; the emblem's colours as tokens `teal` `#0b6676`, `leaf` `#14894c`, `gold` `#d69a35`, `cyan` `#2ec4d6`; font Figtree (Arabic: IBM Plex Sans Arabic). Tokens in `src/app/globals.css`, plus two utilities: `btn-navy` (the glowing navy pill/surface) and `glass` (frosted card). shadcn's `accent` is the quiet hover surface. No floating/bobbing motion (owner rule); the only loop is the residue marquee under the hero.
- Landing page: `src/app/page.tsx` + `src/components/landing/*`. Images in `public/`: `hero-hand.png` (copy of the owner's `herohandandlogo.png`, edges faded into a blue halo with CSS masks — not cut out), `logo-mark.png` (emblem cut from `theme.png`'s header, 77 px, background keyed out; also `src/app/icon.png`). The other visuals (marketplace hub, step previews, dashboard preview) are built in code; their figures are labelled as examples.
- In Arabic, photos of the hand are mirrored (`rtl:-scale-x-100`) so the arm comes in from the outer edge. A mirrored element's CSS mask mirrors with it — don't add `rtl:` mask variants.

## Arabic
English (default) and Arabic (right to left): no URL prefix; the language lives in the `biorefmind.lang` cookie.
- Core in `src/i18n/`: `locale.ts`, `messages.ts` (`defineMessages({ en, ar })` — the Arabic side is typed from the English one, so a missing translation fails `tsc`), `server.ts`, `provider.tsx`, `actions.ts`, `backend-errors.ts`.
- Text lives in `src/components/landing/messages.ts` and `src/components/auth-messages.ts`. Never write user-facing English straight into a component on these pages.
- Translated: landing, `/login`, `/signup`, `/onboarding`. The dashboard is deliberately English and left-to-right until it is rebuilt.
- RTL rules: logical classes (`ms/me`, `ps/pe`, `start/end`, `border-s`, `text-start`); arrows get `rtl:-scale-x-100`; number ranges and the chart get `dir="ltr"`; the residue marquee is forced `dir="ltr"`.
- Reading the cookie makes every page dynamic (`ƒ` in the build).

## Convex
Own project `biorefmind-platform` (team `azeddine-zellag`), dev deployment `resolute-retriever-764` (in `.env.local`). Env set on dev: `SITE_URL` (= `http://localhost:3100`), `BETTER_AUTH_SECRET`. Optional: `OPENROUTER_API_KEY`, `AI_MODEL`. No production deployment yet.

## Commands (PowerShell)
```
npm run dev               # on 8 GB RAM prefer `npm run build; npx next start -p 3100`
npx convex dev --once     # push functions (set CONVEX_TMPDIR=D:\Biorefmind\.convex-tmp)
npm test                  # vitest + convex-test (convex/**/*.test.ts)
npm run typecheck; npm run typecheck:convex; npm run lint; npm run build
```
On a fresh clone run `npx next typegen` (or a build) before `npm run typecheck`: `LayoutProps` is generated. Port 3000 is often taken by another project; local testing uses 3100, matching the dev `SITE_URL`. Deploys (Vercel, `npx convex deploy`) only when the owner says "ship it".

## Status (2026-10-01)
Branch `biorefmind-theme` (from `main` = untouched BioGrena import). Rebrand + new theme done; backend unchanged.
- 33 tests, both type checks, lint and `next build` (8 routes) pass.
- Real Chrome run: landing at 1536 px and 360 px with no sideways scroll, Arabic right-to-left, sign-up → dashboard, sign-out, wrong password message, sign-in → dashboard; no console errors.

## Open decisions (ask the owner)
1. Scoring thresholds in `convex/lib/crops.ts` are placeholders until calibrated with lab data.
2. The AI assistant needs `OPENROUTER_API_KEY` on Convex; without it, answers are rule-based.
3. The theme's social icons (Facebook, X, Instagram) were left out: no account links yet.
4. In Arabic the hero photo is mirrored, so the emblem in it is mirrored too. Alternative: keep it unmirrored on the left.
5. Copy is BioGrena's with the brand renamed, plus new hero lines ("AI quality scoring for bio-waste", "Farmers, factories & labs on one platform") — Arabic should be reviewed by a native speaker.
6. The logo is a 77 px cut from `theme.png`; a vector or high-resolution logo file from the owner would be sharper.
7. Hosting: needs a Vercel project and a production Convex deployment before "ship it".

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

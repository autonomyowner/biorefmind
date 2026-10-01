# CLAUDE.md — BioGrena Platform

BioGrena is a multi-company B2B SaaS (Agro-Medicinal Biomass Intelligence) built by SiteDZ for the BioGrena project owner. Factories and labs record biomass shipments (pomegranate peels first), get a quality score and a route (A pharmaceutical / B food-grade / C low-grade), inspectors override with a logged reason, and teams get analytics, an AI assistant and PDF reports. Proposal: `proposal/`, study summary: `AI project.pdf`.

- Design: `docs/superpowers/specs/2026-09-28-phase-1-platform-design.md`
- Backend contract: `docs/superpowers/contracts/phase-1-backend.md`

## Stack
Next.js 16.3 App Router, React 19.2, TypeScript, Tailwind 4, shadcn `base-nova` over Base UI (`src/components/ui/`), `motion`, ECharts, sonner, Convex + Better Auth (`@convex-dev/better-auth`). Boilerplate copied from AI TRIDI (`D:\aitridi\aitrididibaw`) — **never modify that project**. This Next version differs from training data: read `node_modules/next/dist/docs/` before writing Next code; `params`, `searchParams`, `cookies()` are async.

- Auth: Better Auth runs inside Convex (`convex/auth.ts`, `convex/http.ts`); the site proxies it at `/api/auth/*` so the cookie is first-party. The browser client (`src/lib/auth-client.ts`) has no `baseURL` on purpose. App profiles live in `users`, linked by lowercase email.
- Clients call Convex through `api` in `src/lib/backend.ts` and type results with `src/lib/types.ts`.
- Theme (2026-09-30, cloned from `3templates/main design/`): warm paper background `#ecebe2`, forest ink `#0c241e`, near-black green primary `#061714`, brand amber `honey` `#e8a21e`, `moss` `#5f8f22`; font Inter Tight. Tokens in `src/app/globals.css`. shadcn's `accent` is the quiet beige hover surface, not the amber: use `bg-honey`/`text-honey` for the brand amber. No floating/bobbing motion (owner rule); the only loop is the residue marquee under the hero.
- Landing page: `src/app/page.tsx` + `src/components/landing/*` (header with hover dropdowns and a phone menu, How it works, Routes). Images in `public/` (`hero-moss-cutout.png`, `globe.png`, `laptop-branch.png` are background-removed cutouts of the owner's designs; `step-*.png` are blended into their cards, not cut out).

## Arabic (added 2026-09-30)
English (default) and Arabic (right to left), same approach as AI TRIDI: no URL prefix; the language lives in the `biogrena.lang` cookie.
- Core in `src/i18n/`: `locale.ts` (`parseLocale`, `dirOf`), `messages.ts` (`defineMessages({ en, ar })` — the Arabic side is typed from the English one, so a missing translation fails `tsc`), `server.ts` (`getLocale`, `getMessages` for server components), `provider.tsx` (`I18nProvider`, `useLocale`, `useMessages`; also feeds Base UI's `DirectionProvider`), `actions.ts` (`saveLocale`), `backend-errors.ts` (Arabic for known backend refusals on the sign-in pages).
- Text lives in `src/components/landing/messages.ts` and `src/components/auth-messages.ts`. Never write user-facing English straight into a component on these pages.
- Translated: landing page, `/login`, `/signup`, `/onboarding` (with an EN | عربي switch, `src/components/language-switch.tsx`). The dashboard is deliberately English and left-to-right (its layout wraps it in `lang="en" dir="ltr"`) until it is rebuilt.
- RTL rules: logical classes (`ms/me`, `ps/pe`, `start/end`, `border-s`, `text-start`); arrows get `rtl:-scale-x-100`; number ranges get `dir="ltr"`; the residue marquee is forced `dir="ltr"`. Arabic pages lead with IBM Plex Sans Arabic (after Inter Tight it never loads, because Inter's Arial fallback already has Arabic glyphs); `:lang(ar)` zeroes letter-spacing; `[lang="en"]` islands keep Inter Tight.
- Reading the cookie makes every page dynamic (`ƒ` in the build). Fine on Vercel; revisit if the landing page ever needs static or edge caching (cache one copy per language).

## Convex
Project `biogrena-platform`, dev deployment `grandiose-bandicoot-465` (in `.env.local`). Env: `SITE_URL`, `BETTER_AUTH_SECRET`, optional `OPENROUTER_API_KEY`, `AI_MODEL`.

## Commands (PowerShell)
```
npm run dev               # http://localhost:3000 (on 8 GB RAM prefer `npm run build; npm start`)
npx convex dev --once     # push functions + regenerate convex/_generated (set CONVEX_TMPDIR=D:\biogrenaplatform\.convex-tmp)
npm test                  # vitest + convex-test (convex/**/*.test.ts)
npm run typecheck; npm run typecheck:convex; npm run lint; npm run build
```
Deploys (Vercel, `npx convex deploy`) only when the owner says "ship it".

On this machine port 3000 is often taken by another project (Mentada); do not stop it. To test locally on another port, set the dev `SITE_URL` to that origin (`npx convex env set SITE_URL http://localhost:3100`), run `npx next start -p 3100`, and set it back afterwards. A browser smoke script lives in the session scratchpad only; see "Status" for what it covered.

## Status (2026-09-28)
- **Frontend reset to a blank skeleton** on branch `blank-skeleton`: pages are `/`, `/login`, `/signup`, `/onboarding`, `/dashboard` (empty, auth-guarded). Auth works; everything else is to be rebuilt. The notes below describe the old UI (still on `phase-1`).
Phase 1 is built on branch `phase-1` and verified locally; **not deployed** (no Vercel project, no production Convex deployment yet).
- 33 backend tests pass; typecheck, lint and `next build` (15 routes) pass.
- A real Chrome run passed: landing (no sideways scroll at 360 px), `/demo` scoring, sign-up → dashboard, demo data (40 shipments, charts), shipment list and detail, override logged, printable report, assistant (built-in responder), wrong/right password.

- 2026-09-30 (branch `blank-skeleton`): landing page rebuilt from the owner's designs, and Arabic added (see "Arabic"). Verified in Chrome in both languages at desktop and phone width; 33 tests, typecheck, lint and `next build` (7 routes) pass.

## Open decisions (ask the owner)
1. Scoring thresholds in `convex/lib/crops.ts` are placeholders until calibrated with the study's lab data.
2. The AI assistant needs `OPENROUTER_API_KEY` (and optionally `AI_MODEL`) set on Convex; without it, answers are rule-based.
3. Landing copy written by us (the 2026-09-30 landing): section headlines, the six marketplace points, the example listings and quality card, and the draft pricing.
4. Invited teammates sign up at `/signup`, which also asks for a company name and creates a second workspace. A dedicated "join" sign-up is not built yet.
5. Hosting: Vercel (per proposal) — needs an account/project and a production Convex deployment before "ship it".
6. Arabic copy was written by us (Modern Standard Arabic) and should be reviewed by a native speaker; the brand stays "BioGrena" in Latin letters inside Arabic text.
7. The owner's mock-up photos show example figures ("86/100", "1,248 samples", "+22%") and spell the brand "Biogrena" on the laptop screen.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

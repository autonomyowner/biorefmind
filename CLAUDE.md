# CLAUDE.md — BiorefMind Platform

BiorefMind started as a copy of the BioGrena platform (`D:\biogrenaplatform`); the old green "nature" theme is archived at `github.com/autonomyowner/saasnaturebiogrena` and is **not** to be revived here — work only on the BiorefMind theme. Same product: a **bio-waste marketplace** where farmers and factories sell peels, pomace and residues to factories that need them, and every batch gets a 0–100 quality score and a route (A pharmaceutical / B food-grade / C recovery). Inspectors override routes with a logged reason; teams get analytics, an AI assistant and PDF reports. **Never modify the BioGrena project** — this repo is a separate copy.

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
- **Section designs (2026-10-02):** the owner's references are in `dersignref/` (untracked). "How it works" follows `De la biomasse à la vente.png`: gradient headline word (`text-gradient`), glossy step numbers and arrows (`orb`), the hand-and-globe bleeding off the page edge (`bleed-end`), frosted cards with the app pictures and a pill at the bottom. Highlight colours `azure` `#3f6cf2` and `violet` `#7b5cf0`.
- **One look everywhere (owner, 2026-10-02: "no backgrounds, in sync"):** every section opens with `SectionBadge` and a `Headline` whose last words are in the gradient (`src/components/landing/section-badge.tsx`; messages carry `titleLead` + `titleAccent`). Accents are azure/violet only; teal/gold/cyan/leaf tokens remain only for the logo's own colours and are not used in the UI.
- Landing page: `src/app/page.tsx` + `src/components/landing/*`. **Every picture is a background-free PNG in `public/art/`** — never put a photo with its background on the page:
  - `hand-emblem.png` (hero and sign-in pages), `hand-emblem-2.png` (closing banner), `globe.png` (marketplace hub), `hand-globe.png` + `step-*.png` (How it works), `dashboard-ar.png` (routes section, **Arabic pages only**; English pages show a coded preview in the same style).
  - Cut out with `@imgly/background-removal-node` (model `medium`, run locally from a scratchpad script; free, nothing uploaded). It fails on flat UI screenshots (it made the frosted dashboard see-through): cut those along their own rounded rectangle instead (done for `dashboard-ar.png`).
  - Arms cut by a picture's edge are placed so that edge sits on the page/banner edge (`object-[100%_…]`, `bleed-end`), with a short mask fade where needed.
  - New file names when a picture changes (the image optimizer and browsers cache by URL).
  - `logo-mark.png` (emblem cut from `theme.png`'s header, 77 px; also `src/app/icon.png`).
- In Arabic, photos of the hand are mirrored (`rtl:-scale-x-100`) so the arm comes in from the outer edge. A mirrored element's CSS mask mirrors with it — don't add `rtl:` mask variants.

## Arabic
English (default) and Arabic (right to left): no URL prefix; the language lives in the `biorefmind.lang` cookie.
- Core in `src/i18n/`: `locale.ts`, `messages.ts` (`defineMessages({ en, ar })` — the Arabic side is typed from the English one, so a missing translation fails `tsc`), `server.ts`, `provider.tsx`, `actions.ts`, `backend-errors.ts`.
- Text lives in `src/components/landing/messages.ts` and `src/components/auth-messages.ts`. Never write user-facing English straight into a component on these pages.
- Translated: landing, `/login`, `/signup`, `/onboarding`, `/marketplace`, `/verify` and every `/dashboard` page. `/admin` stays English.
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
GitHub: `https://github.com/autonomyowner/biorefmind`. `main` carries BiorefMind (theme merged 2026-10-02); section polish on branch `polish-sections`, merged into `main`. Backend unchanged.
- 33 tests, both type checks, lint and `next build` (8 routes) pass.
- Real Chrome run: landing at 1536 px and 360 px with no sideways scroll, Arabic right-to-left, sign-up → dashboard, sign-out, wrong password message, sign-in → dashboard; no console errors.

## Account types (2026-10-02, live)
Three kinds of workspace: `farm` (free), `lab` (**$100/month = 25,000 DA**, 14-day trial, listed in the directory while trial or paid), `factory` (enterprise, custom). Design: `docs/superpowers/specs/2026-10-02-three-account-types-design.md`; plan: `docs/superpowers/plans/2026-10-02-three-account-types.md`. Piece 2 (marketplace) is live (see below); pieces 3–4 (lab requests, billing) are not built yet.
- Backend: rules in `convex/lib/accounts.ts` (+ catalog in `convex/lib/catalog.ts`); `companies.create/mine/updateProfile`, `labs.directory`, `enterprise.request`, `admin.overview/setLabPaidUntil`. 44 tests.
- Website: two-step sign-up (`src/components/auth-forms.tsx`), per-kind dashboards (`src/components/dashboard/*`, bilingual), admin page `/admin` (`src/components/admin/admin-page.tsx`).
- **Admins** = Convex env `ADMIN_EMAILS`. Sign-up does **not** verify emails, so only list addresses whose account already exists (whoever registers an address first owns it). Prod lists only `admin@biorefmind-preview.app` (account created at launch; password given to the owner).

## Dashboards polish (shipped 2026-10-03, merged `0366c0d`)
Design `docs/superpowers/specs/2026-10-03-dashboards-polish-design.md`, plan `docs/superpowers/plans/2026-10-03-dashboards-polish.md`.
- **Prices:** `convex/lib/pricing.ts` is the only place for the lab price ($100) and the fixed rate (1 USD = 250 DZD). `src/lib/pricing.ts` formats ("$100" / "25,000 DA" / "100$" / "25,000 دج"). `src/components/currency.tsx`: `useCurrency`, `Price`, `usePrice`, `CurrencySwitch` (choice in localStorage `biorefmind.currency`; default USD in English, DZD in Arabic). Message text that cannot switch shows both ("$100 (25,000 DA)"); text that can uses a `{price}` slot.
- **Frame:** `src/components/app-frame.tsx` (sidebar with the section in view highlighted, animated phone drawer, `FrameSkeleton`) frames both the user dashboards and `/admin`. Motion helpers in `src/components/motion.tsx` (`FadeIn`, `CountUp`); one-shot only, `MotionConfig reducedMotion="user"`.
- **Admin:** overview tiles, sign-ups chart (last 30 days), monthly lab revenue, labs needing attention, searchable accounts, lab billing (`admin.extendLab` +1/+3/+12 months from the later of now and the current end; `admin.endLabPlan`; custom date), enterprise requests.
- **Production:** security headers + no `x-powered-by` (`next.config.ts`), `robots.txt`, `global-error.tsx`. Next 16.3 error pages take `retry()` (not `reset`).
- Vitest also runs `src/**/*.test.ts`. 50 tests.
- Dev Convex `ADMIN_EMAILS` also lists `admin-smoke-1003@example.com` (Chrome smoke test). There is no delete function, so smoke accounts ("Smoke Lab …", "Smoke Admin Farm") stay on dev.

## Marketplace (piece 2, shipped 2026-10-04, merge `1cc03db`)
Design + contract `docs/superpowers/specs/2026-10-04-marketplace-design.md`, plan `docs/superpowers/plans/2026-10-04-marketplace.md`.
- Farms post lots (residue, kg, **DA per kg**, region, note, up to 4 photos); factories browse (no phone shown) and offer on all or part; the farm accepts or declines. Accepting records a `sales` row (total + 5% buyer fee), lowers `remainingKg` (0 → sold) and declines pending offers that no longer fit. Phones are shared only through sales.
- Backend: `convex/market.ts` (rules + refusal texts in `convex/lib/market.ts`, fee rate `MARKET_FEE_RATE` in `convex/lib/pricing.ts`), `admin.sales`. Tables `listings`, `offers`, `sales`; listing photos reuse `photoClaims`.
- Website: `src/components/dashboard/market.tsx` + `market-messages.ts` (farmer: My listings, Sales; factory: Browse, My offers, Sales), admin "Marketplace" section. Photos are shrunk to 1600 px JPEG in the browser before upload.
- 68 tests (incl. a test that every backend refusal has Arabic). Functions pushed to dev Convex. Chrome run on dev passed 24/24 checks (post with photo → offer → accept → sales and phones on both sides, Arabic RTL, 360 px, admin, guest preview), no console errors. Smoke accounts "Smoke Farm …"/"Smoke Factory …" stay on dev.
- Shipped 2026-10-04: Convex prod deployed first (tables `listings`/`offers`/`sales` added), then `main` `1cc03db` pushed; Vercel deploy succeeded. Read-only prod checks passed: home, headers, robots, guest marketplace at 1440/360 px in English and Arabic, admin hidden, `market.browse` live on prod. Rollback: redeploy code `206bd6b` to Vercel (the new tables can stay; nothing old reads them).

## Public marketplace page (shipped 2026-10-05, merge `4537fb7`)
Design `docs/superpowers/specs/2026-10-05-public-marketplace-design.md`.
- `/marketplace` (`src/app/marketplace/page.tsx`, `src/components/marketplace/*`): every open lot for anyone, no sign-in; phones never shown. Server renders the first answer (`fetchQuery`), the browser keeps it live. Residue filter, sort, detail dialog; English + Arabic.
- Backend: `market.publicLots` (no auth) shares one helper with `market.browse` (auth), so both return the same rows. 70 tests.
- `/signup?as=farm|lab|factory` opens sign-up on that account type. Guests' "Sign up to make an offer" → `?as=factory`; signed-in "Make an offer" → `/dashboard#browse`.
- Header: new "Marketplace" link; the full desktop menu now starts at 1280 px (`xl`), below that the menu button (1024 px collided). Footer moved to `src/components/landing/site-footer.tsx` (shared by home and marketplace).
- Shipped 2026-10-05: Convex prod deployed first (`market.publicLots` answers anonymously), then `main` `4537fb7` pushed; Vercel served it in ~50 s. Read-only prod checks passed: `/marketplace` 200 with security headers, English 1440 px and Arabic 360 px (RTL, no sideways scroll, empty state: prod has no open lots yet), home links to it, `/signup?as=factory`, robots, no console errors. Rollback: redeploy code `b1bb219` to Vercel (`publicLots` can stay; nothing old calls it).
- 2026-10-05 footer release: on phones (under 768 px) the footer is two short lines (Lots for sale · Pricing · FAQ, then logo + © 2026; ~700 px → 164 px); desktop unchanged. `main` `3947b3b`, website only. Prod checked at 360 px. Rollback: redeploy `1136f2f`.
- Chrome run on dev passed: 1440/1280/1024/360 px, Arabic RTL, filters/sort/dialog/Escape, `?as=factory`, signed-in factory → Browse; no sideways scroll; no console errors. Smoke account "Smoke Factory mkt1005" stays on dev.

## Typed residue (shipped 2026-10-06, merge `94df36e`)
- A farmer whose residue is not in the list types it ("Not in the list? Type exactly what you have"): stored as `residue: "other"` + `residueName` (2–80 chars, `cleanResidue` in `convex/lib/market.ts`), carried onto the sale. Typing clears the chip and a chip clears the text. Shown everywhere via `residueLabel` (`src/lib/catalog-labels.ts`); the Browse and /marketplace filters gain "Other". The factory sign-up "buys" chips are unchanged.
- 74 tests; dev Convex pushed; Chrome run on dev 11/11 (account "Smoke Farm muw9pzfa" stays on dev). 
- Shipped 2026-10-06: Convex prod deployed first (optional `residueName` on `listings`/`sales`), then `main` `94df36e` pushed. Read-only prod checks passed: /marketplace and home 200, "Other" filter in English 1440 px and Arabic 360 px (RTL, no sideways scroll), no console errors. The typing box itself was not tried on prod (needs a farm account). Rollback: redeploy code `be8c8a8` to Vercel (the new optional fields can stay; old code ignores them, but typed lots would show as "other").

## Lab requests and results (lab SaaS piece 1, shipped 2026-10-06, merge `2a13b7c`)
Design + contract `docs/superpowers/specs/2026-10-06-lab-requests-design.md` (its "Expert review" section overrides the parts above it), plan `docs/superpowers/plans/2026-10-06-lab-requests.md`. The owner delegated the domain decisions to a lab-operations expert agent (Algerian agri-food labs, ISO/IEC 17025).
- Labs set a **price list** (DA per sample + turnaround in working days), address, hours, sample retention and a "pause new requests" switch (`labs.updateSettings`; shown in `labs.directory`). Farms (for their own lot or no lot) and factories (for a lot they bought, or no lot) send **requests** (`convex/labwork.ts`); the client pays the lab directly, no BiorefMind fee.
- Lifecycle `requested → accepted|declined → received → released`, `cancelled`; timeouts worked out on read (`effectiveStatus`: unanswered 7 days / no sample 30 days → expired; lab no longer listed → lab_unavailable). A late sample can still be received. Inspectors (analysts) receive and save drafts; owners/managers accept, release, amend, mark paid.
- **Certificates** (`labReports`) are frozen copies when issued; amendments add versions (old one says "Superseded"). Public page `/verify/<code>` (printable A4, QR, page x of y) and `/verify` lookup; never shows the score or the client's phone.
- A farm can **show released results on its own lot** (`market.attachLabReport`): "Lab-tested" badge on /marketplace and Browse for 90 days while open, with BiorefMind's score/route for pomegranate peels only (`lotScore` adapter over the unchanged engine: punicalagin mg/g ÷ 10, moisture only for dried, moulds CFU/g → log, failed contamination → C).
- Catalog: + pectin; contamination split into `heavy_metals`/`mycotoxins`/`pesticides` (panel analyses with lines and conformity only against a cited limit); old "contamination" reads as heavy metals (`normalizeServices`).
- Website: lab workspace `src/components/dashboard/lab/*` (month stats, work queue, request detail, results form, sample label with QR, prices & settings); client side `src/components/dashboard/labtests/*` + `lab-directory.tsx` (prices, request dialog, Lab tests section, Show on my lot); `src/components/certificate/*`, `src/components/marketplace/lab-badge.tsx`; footer "Check a certificate". Dependency `qrcode`.
- 143 tests; both type checks, lint, `next build` (13 routes) pass. Dev Convex pushed. Chrome run on dev 23/23 (lab signs up and prices → farm lists and requests → accept, receive, draft, release → certificate prints, verify lookup → badge with score on /marketplace → amendment supersedes v1 → Arabic RTL at 360 px), no console errors. Smoke accounts "Smoke Lab/Farm muwb…" stay on dev. Script: session scratchpad `lab-smoke.mjs`.
- Shipped 2026-10-06: Convex prod deployed first (tables `labRequests`/`labReports`, optional lab fields on `companies`, `listings.labRequestId`), then `main` `2a13b7c` pushed. Read-only prod checks passed: `/verify` 200 with security headers, unknown code shows the friendly page (English 1440 px, Arabic 360 px, no sideways scroll), /marketplace, footer "Check a certificate", guest dashboard shows Lab tests in both languages, robots; no console errors. The request → certificate flow was not run on prod (needs real lab/farm accounts). Rollback: redeploy code `6a4d14f` to Vercel (the new tables and optional fields can stay; old code ignores them, but labs ticked "contamination" after this would show the raw key).
- Known gaps: no notifications (labs may miss requests), no admin "block lab"/badge removal, lab guest preview not reachable (guest is a farm), Arabic needs a native read.

## Dashboard pages (branch `dashboard-pages`, 2026-10-06, not shipped)
Design `docs/superpowers/specs/2026-10-06-dashboard-pages-design.md` (owner's reference: a 30 s "Fernly" dashboard clip), plan `docs/superpowers/plans/2026-10-06-dashboard-pages.md`.
- Real pages under `/dashboard/…` per account (`src/components/dashboard/frame/pages.ts`): farm Overview, Listings, Sales, Labs (tabs My tests · Find a lab, `?tab=find`), Analytics, Settings; factory Overview, Browse lots, My offers, Sales, Labs, Analytics, Settings (+ Enterprise); lab Overview, Requests, Prices, Analytics, Plan, Settings. A page outside the account's list goes to Overview. Old `/dashboard#section` links forward (`forward-hash.ts`). Paths in `dashboard/links.ts` (`DASH`); `useDashHref()` keeps `?guest=1`.
- Frame: `AppFrame` route mode (hash mode kept for `/admin`), Menu/General groups, count badges (farm pending offers, lab requests to accept/receive), search field at the start of the top bar on wide screens (title on phones), ⌘K/Ctrl+K palette (`frame/command-palette.tsx`, shadcn `command` + `cmdk`), avatar menu. `template.tsx` cross-fades pages. Page bodies in `src/components/dashboard/pages/*` (`homes.tsx` is gone); words in `pages-messages.ts`.
- Analytics: backend `insights.workspace({ companyId, days: 7|30|90 })` (`convex/insights.ts`, pure maths `convex/lib/insights.ts`); UI `src/components/dashboard/insights/*` (hand-built SVG charts + motion: sparkline, area vs previous period, donut, half ring, pill bars, activity grid, range switch `?range=`). Overview uses `WeekCard`/`RingCard`. Guest preview uses `insights/sample.ts`, no backend call.
- `cn` (shadcn's class-merge package) is now a declared dependency; UI files import it. ESLint ignores `.claude/**` (agent worktrees).
- 200 tests, both type checks, lint, `next build` (23 routes). Dev Convex pushed. Chrome on dev 83/84: every page × farm/factory/lab, English 1440 px and Arabic 360 px (RTL, no sideways scroll), real sale → badge, Next up, analytics figures (16,800 DA farm / 17,640 DA factory), ⌘K, range switch, old hash links, guest preview, no console errors; the one miss (farm on a lab page redirect) passed 4/4 when re-run alone. Smoke accounts "Smoke farm/factory/lab muwe…" stay on dev. Script: session scratchpad `pages-smoke.mjs`.
- Ship order: Convex prod first (`insights.workspace` is new; nothing old calls it), then `main`.

## Production (shipped 2026-10-02)
- Site: **https://biorefmind.vercel.app** (Vercel project `biorefmind`, team azeddine-zellags-projects, Git-connected: pushes to `main` deploy). First prod deployment: `biorefmind-6aeuzadn4…` (the earlier `biorefmind-1xqsierlj…` had broken env vars).
- Convex prod: `adventurous-hornet-38` (`https://adventurous-hornet-38.eu-west-1.convex.cloud`); env `SITE_URL=https://biorefmind.vercel.app`, `BETTER_AUTH_SECRET`, `ADMIN_EMAILS`. Deploy functions with `npx convex deploy -y`.
- Vercel env (production): `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`. **Add Vercel env values from Git Bash with `printf '%s' value | vercel env add …`** — piping from PowerShell prepends a BOM and breaks every request ("Invalid URL").
- Rollback: code `5f68dd5` is the first shipped `main`; no earlier production existed.
- 2026-10-03 release (dashboards polish, lab $100 = 25,000 DA): `main` `0366c0d` + `1d780ac`, Convex prod deployed first. Rollback: code `aa1531f` (redeploy it to Vercel and `npx convex deploy` from it; the new `admin.extendLab/endLabPlan` are only called by the new admin page). Read-only prod checks passed: headers, pricing switch, robots, sign-up price, guest dashboard at 360 px, admin hidden.

## Open decisions (ask the owner)
1. Scoring thresholds in `convex/lib/crops.ts` are placeholders until calibrated with lab data.
2. The AI assistant needs `OPENROUTER_API_KEY` on Convex; without it, answers are rule-based.
3. The theme's social icons (Facebook, X, Instagram) were left out: no account links yet.
4. In Arabic the hero photo is mirrored, so the emblem in it is mirrored too. Alternative: keep it unmirrored on the left.
5. Copy is BioGrena's with the brand renamed, plus new hero lines ("AI quality scoring for bio-waste", "Farmers, factories & labs on one platform") — Arabic should be reviewed by a native speaker.
6. The logo is a 77 px cut from `theme.png`; a vector or high-resolution logo file from the owner would be sharper.
7. Enterprise requests reach only the admin page: should they also go to an email or WhatsApp number?
8. Which real emails should be admins on production (each must register before being added)?
9. The lists of lab analyses and factory residues (`convex/lib/catalog.ts`) are our draft.
10. Email verification is off: turn it on before real users (needs an email service).
11. The 250 DA/USD rate is fixed in code. Should the admin be able to change it, or should dinar prices be set separately?
12. How do labs pay (bank transfer, CCP, BaridiMob, cash)? The lab page says "pay BiorefMind" without saying how; add the payment details when chosen.
13. Marketplace defaults chosen without the owner: prices in DA per kg only (no USD switch); partial offers allowed; phones shared only after a sale; the 5% fee is still the draft rate and is not billed (piece 4); lots have no quality score until lab results exist (piece 3).
14. Should farmers/factories be told about new offers and sales by SMS, WhatsApp or email? Right now they see them only when they open the dashboard.
15. The public marketplace shows each lot's seller name, region and the farmer's note to everyone (phones stay hidden). A farmer could type a phone number into the note; should notes be checked or hidden from guests?
16. Lab requests defaults chosen by the expert agent (owner delegated): fixed price lists (no quotes), no BiorefMind fee per request, 7-day answer / 30-day sample timeouts, badge 90 days, scoring only for pomegranate peels with placeholder thresholds (punicalagin 100 mg/g for route A, moulds > 100,000 CFU/g → C). Next lab pieces: notifications (most urgent), team plans (Solo/Team/Network, seats, sign-off), lab extras (client list, invoices, accreditation, branded PDF), French.
17. Should the admin verify a lab's commercial registration before marking it paid? Certificates are only as trustworthy as the lab.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

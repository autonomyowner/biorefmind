# Dashboard pages and polish — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** turn each account's one-page dashboard into real pages with a clip-level frame (top bar, ⌘K, avatar menu, badges), one-shot motion, and an Analytics page fed by `insights.workspace`.

**Architecture:** the shell stays in `src/app/dashboard/layout.tsx`; each page is a route under `src/app/dashboard/*/page.tsx` that renders a client component. Existing panels (listings, sales, browse, offers, lab queue, prices, lab tests, directory, profile) are reused as-is inside page layouts. Charts are hand-built SVG + `motion`.

**Design:** `docs/superpowers/specs/2026-10-06-dashboard-pages-design.md` (§7 is the backend contract).

**Tech stack:** Next.js 16.3 App Router (read `node_modules/next/dist/docs/` before writing Next code), React 19.2, Tailwind 4, shadcn `base-nova` over Base UI (`src/components/ui/`), `motion`, Convex.

---

## Part 1 — Core (done on branch `dashboard-pages`)

### Task 1: Backend `insights.workspace` ✅ `f5c373c`
- `convex/lib/insights.ts` (pure: `cleanDays`, `periods`, `activityDays`, `farmInsights`, `factoryInsights`, `labInsights`, type `Insights`), `convex/lib/insights.test.ts` (12 tests).
- `convex/insights.ts` (query, any member), `convex/insights.test.ts` (3 tests: farm + factory from one sale, lab request, refusals).
- Refusal "Choose 7, 30 or 90 days." with Arabic in `src/i18n/backend-errors.ts`; covered by `backend-errors.test.ts`.
- Pushed to dev Convex; `convex/_generated/api.d.ts` regenerated and committed.

### Task 2: Shared starting point ✅
- `src/components/dashboard/links.ts`: `DASH` (every page path), `withGuest(href, guest)` (+ `links.test.ts`).
- `src/components/dashboard/use-dash-href.ts`: `useDashHref()` → `(href) => string` keeping `?guest=1`.
- Placeholders with the final names (Task 4 replaces them): `src/components/dashboard/insights/analytics-page.tsx` → `AnalyticsPage()`; `src/components/dashboard/insights/overview-cards.tsx` → `WeekCard({ className })`, `RingCard({ className })`.

## Part 2 — Parallel (two builders, separate worktrees, separate files)

### Task 3: Frame, pages and Overview (builder A)

Owns: `src/app/dashboard/**`, `src/components/app-frame.tsx`, `src/components/dashboard/shell.tsx`, `homes.tsx` (split it), new `src/components/dashboard/pages/*`, `src/components/dashboard/frame/*`, `src/components/dashboard/messages.ts`, new `src/components/dashboard/pages-messages.ts`, `src/components/ui/{command,sheet,skeleton,avatar}.tsx` (shadcn add), `package.json`/lock (cmdk), small href fixes in `market.tsx`, `lab/settings.tsx`, `labtests/my-requests.tsx`, `marketplace/market-board.tsx`, `admin/admin-page.tsx` (only if `AppFrame` props change).

- [ ] Routes: `src/app/dashboard/{listings,sales,browse,offers,labs,requests,prices,analytics,plan,settings}/page.tsx`, each a thin server file rendering a client page component; `src/app/dashboard/template.tsx` for the per-navigation cross-fade.
- [ ] Allowed pages per kind (spec §1); a page outside the list → `router.replace(withGuest("/dashboard"))`.
- [ ] Old hash forwarding on `/dashboard` (spec §1 table).
- [ ] `AppFrame` route mode (active from `usePathname()`), badges, top bar (title + kind, ⌘K button, language switch, avatar dropdown); hash mode kept for `/admin`.
- [ ] ⌘K palette (`cmdk` via shadcn `command`), Ctrl/⌘+K, pages + actions (spec §2), bilingual.
- [ ] Page header component (title, description, main action) used by every page.
- [ ] Overview per kind (spec §4): lead navy tile + 3 tiles with arrow links, `WeekCard`, `RingCard`, Next up, Recent activity, Steps (hrefs → pages).
- [ ] Listings, Sales, Browse, Offers, Requests, Prices, Labs (Tabs, `?tab=find`), Plan, Settings pages (spec §6). Listings opens the new-listing form when `?new=1`.
- [ ] Every user-facing word in `pages-messages.ts` (en + ar).
- [ ] Checks: `npm test`, `npm run typecheck`, `npm run typecheck:convex`, `npm run lint`. No build, no dev server.

### Task 4: Charts and Analytics (builder B)

Owns: `src/components/dashboard/insights/**` (replace both placeholders), new `src/components/dashboard/insights/insights-messages.ts`, `src/lib/types.ts` (add `WorkspaceInsights`).

- [ ] `useInsights(days)`: `useQuery(api.insights.workspace, …)`; guest preview returns a deterministic farm sample.
- [ ] Chart primitives (SVG + motion, `dir="ltr"`): `Sparkline`, `AreaCompare` (current fill + previous dashed, hover/focus tooltip), `Donut`, `HalfRing`, `PillBars` (hatched empty days), `ActivityGrid`, `RangeSwitch` (7D/30D/90D, `?range=`).
- [ ] `AnalyticsPage`: header, range switch, KPI tiles with change % and sparklines, area chart, donut + legend, top partners, activity grid; labels per kind (spec §5); skeleton while loading; empty states.
- [ ] `WeekCard` and `RingCard` for the Overview (spec §4.3–4.4).
- [ ] Pure helpers (`change %`, nice axis ticks, path building) in `insights/chart-math.ts` with `chart-math.test.ts`.
- [ ] Checks as in Task 3.

## Part 3 — Integration and verification (me)

### Task 5: Merge and review
- [ ] Read both diffs; merge `--no-ff` into `dashboard-pages`; resolve; full checks.

### Task 6: Verify
- [ ] `npm test`, both type checks, lint, `npm run build` (foreground).
- [ ] Chrome on dev (`next start -p 3100`): farm, factory and lab accounts, every page, English 1440 px and Arabic 360 px, ⌘K, avatar menu, badges, old hash links, guest preview on every page, analytics range switch, no console errors, no sideways scroll.

### Task 7: Docs
- [ ] CLAUDE.md section, memory note; ship only on "ship it" (Convex prod first, then `main`).

## Summary

The dashboard becomes several clear pages, like the video, in our blue look.
A new Analytics page shows each account how its sales or lab work are going.
Everything is checked in a real browser, in English and Arabic, before release.

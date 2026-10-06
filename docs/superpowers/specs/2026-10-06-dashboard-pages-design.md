# Dashboard pages and polish — design (2026-10-06)

Approved by the owner on 2026-10-06. Reference: a 30 s screen recording of the "Fernly" dashboard (Dashboard → Tasks → Team → Calendar → Analytics → Settings), studied frame by frame. We copy its **structure, motion and level of polish**, not its green theme: everything stays in the BiorefMind ice-blue / navy theme with azure `#3f6cf2` and violet `#7b5cf0` accents. No floating or looping motion.

## 1. Pages instead of one long page

Every account type gets real pages under `/dashboard/…` (Next.js App Router). The shell (sidebar + top bar) lives in `src/app/dashboard/layout.tsx`, so it stays mounted while pages change and the sidebar highlight slides between items.

| Account | Pages (sidebar order) |
|---|---|
| Farm | Overview `/dashboard`, Listings `/dashboard/listings`, Sales `/dashboard/sales`, Labs `/dashboard/labs` (tabs: My tests · Find a lab), Analytics `/dashboard/analytics`, Settings `/dashboard/settings` (profile, language, currency) |
| Factory | Overview, Browse lots `/dashboard/browse`, My offers `/dashboard/offers`, Sales, Labs, Analytics, Settings (profile, language, currency, Enterprise request) |
| Lab | Overview, Requests `/dashboard/requests`, Prices `/dashboard/prices`, Analytics, Plan `/dashboard/plan`, Settings (public profile, language, currency) |

- A page that is not in the account's list (a lab opening `/dashboard/listings`) redirects to `/dashboard` (client `router.replace`).
- **Old links keep working.** On `/dashboard`, a hash from the old one-page layout forwards to its page: `#listings #sales #labtests #labs #browse #offers #enterprise #requests #prices #profile #plan` → `listings, sales, labs, labs?tab=find, browse, offers, settings, requests, prices, settings, plan`. `#labs` opens the "Find a lab" tab.
- Links inside the app use the new paths (checklist steps, marketplace "Make an offer" → `/dashboard/browse`, `/marketplace` page link for farmers, toasts that say "see Sales").
- **Guest preview** (`?guest=1`): every sidebar link, ⌘K entry and in-page link keeps `?guest=1`. A small `useDashHref()` helper builds hrefs.
- `/admin` keeps its one page with hash sections; it shares the new frame (top bar style), with section tracking as today.

## 2. Frame and top bar

`AppFrame` gains a **route mode**: items are paths, the active item comes from `usePathname()` (exact for `/dashboard`, prefix for the others). Hash mode stays for `/admin`.

- **Sidebar:** the moving navy highlight (existing `layoutId`), plus **count badges** where something waits for the user: farm Listings = pending offers on their lots; lab Requests = requests in status `requested` + `accepted` (to receive); factory Offers = none. Counts come from queries the pages already use.
- **Top bar:** page title (and the account kind above it in small azure text) on the left; on the right: **⌘K search button** (also Ctrl+K), language switch, **avatar menu** (dropdown: workspace name and kind, Settings, Admin if admin, Sign out / Exit preview).
- **⌘K command palette** (shadcn `command`, `cmdk`): go to any page of the account; actions: farm "New listing" (opens Listings with the form open via `?new=1`), factory "Browse lots", lab "Requests"; "Switch language"; "Sign out". Bilingual, RTL-aware.
- Phone: the existing drawer; the top bar shows the menu button, title, ⌘K icon and avatar.

## 3. Motion (one-shot only, `MotionConfig reducedMotion="user"`)

- Page enter: the page's cards fade and rise in sequence (`FadeIn` index stagger, 60 ms apart), numbers count up (`CountUp`), bars grow from the bottom, rings and donuts draw their stroke, area charts reveal left to right.
- Page switch: content cross-fades quickly (≈150 ms) via a `template.tsx` in `src/app/dashboard/` (re-mounts per navigation).
- Hover: cards lift 2 px with a deeper shadow; buttons darken; chart points show tooltips.
- Loading: per-page skeletons in the page's own layout (`Skeleton` component).
- Nothing bobs, sways or loops.

## 4. Overview (per account)

1. Greeting (as today) + guest banner.
2. **Stat tiles:** a navy **lead tile** (`btn-navy` surface) and three glass tiles, each with a round arrow link to its page (farm lead: open lots → Listings; factory lead: open lots to buy → Browse; lab lead: requests waiting → Requests).
3. **Week bars:** "This week" pill-shaped bars per day (7 bars, rounded full; days with nothing are hatched with a diagonal stripe pattern; today in navy, the best day labelled with its value), from `insights.workspace({ days: 7 })` series.
4. **Progress ring** (half-gauge like the clip, stroke draws in): farm = share of listed kg sold (all time); factory = share of answered offers that were accepted; lab = share of released results on or before their due date. Empty state when no data ("—").
5. **Next up** card (navy gradient): the single most urgent thing with a button — farm: oldest pending offer → Listings; factory: newest open lot matching what they buy → Browse; lab: oldest request to accept/receive → Requests. Otherwise a calm "All caught up" line.
6. **Recent activity** list (last 5 sales / offers / requests with time-ago) and the getting-started checklist (existing `Steps`, links updated).

## 5. Analytics page (all accounts)

- Header: title + subtitle; **7D / 30D / 90D** segmented switch (default 30D, choice kept in the URL `?range=30`).
- **4 KPI tiles**, each with value, change vs the previous period (▲/▼ %, green/red, "—" when previous is 0) and a sparkline of the period.
- **Area chart** "this period" (azure fill gradient) vs "previous period" (dashed violet line), y gridlines, x date labels, hover/focus tooltip with date, value and previous value; draws in left to right.
- **Donut** with total in the middle and a legend (top 5 + "Other").
- **Top partners** list (5) with bars.
- **Activity grid**: 20 weeks × 7 days of event counts, 5 shades of azure, "Less → More" legend.
- Charts are hand-built SVG + `motion` (like the admin sign-ups chart); no new chart library. All numbers `dir="ltr"`, labels translated.

| | KPI 1 | KPI 2 | KPI 3 | KPI 4 | Area | Donut | Top |
|---|---|---|---|---|---|---|---|
| Farm | DA sold | kg sold | sales | avg DA/kg | DA sold per day | DA by residue | buyers by DA |
| Factory | DA spent (price + fee) | kg bought | offers sent (+ acceptance rate) | avg DA/kg | DA spent per day | DA by residue | sellers by DA |
| Lab | requests received | results released | revenue DA (released) | avg turnaround (days) | requests per day | analyses by count | clients by DA |

## 6. Settings, Plan, Labs pages

- Settings: `ProfileCard` (edit), language switch, currency switch (`CurrencySwitch`), and for factories the Enterprise card; for labs the public profile (`ProfileCard` with public title).
- Plan (labs): the existing `LabPlanCard`, full width, plus what is visible in the directory.
- Labs (farm/factory): shadcn `Tabs` "My tests" (`LabTests`) · "Find a lab" (`LabDirectory`); `?tab=find` selects the second.
- Listings / Sales / Browse / Offers / Requests / Prices: the existing panels, full width, under a page header (title + one-line description + the page's main button where it has one).

## 7. Backend contract: `insights.workspace`

New file `convex/insights.ts`; pure adding-up in `convex/lib/insights.ts` (unit-tested without a database).

```ts
insights.workspace({ companyId: Id<"companies">, days: number })
```

- Access: any member of the workspace (`requireMember`, inspector and up). Others: `"You don't have access to this workspace."` (existing text).
- `days` must be 7, 30 or 90, else refusal **`"Choose 7, 30 or 90 days."`** (with Arabic in `src/i18n/backend-errors.ts`).
- Days are UTC days. The current period is the last `days` UTC days, today included; the previous period is the `days` before it.

Returns:

```ts
{
  kind: "farm" | "factory" | "lab",
  days: 7 | 30 | 90,
  start: number,               // UTC midnight of the first day of the current period
  kpis: Array<{
    key: string,               // see below
    value: number,             // current period
    previous: number,          // previous period
    spark: number[],           // `days` values, oldest first (current period, per day)
  }>,
  series: { current: number[], previous: number[] },   // `days` values each, oldest first
  breakdown: Array<{ key: string, value: number }>,    // current period, desc, at most 6 (5 + "other_total" lumped as key "rest")
  top: Array<{ name: string, value: number, count: number }>, // current period, desc by value, at most 5
  activity: number[],          // 140 values: event counts per UTC day, 20 weeks ending today, oldest first
  ring: number | null,         // all-time share 0..1 (see Overview), null when there is nothing to measure
}
```

KPI keys and definitions (amounts rounded to 2 decimals, averages to 2, turnaround to 1):

- **farm** (sales where `sellerId` = company, by `createdAt`): `soldDzd` = Σ totalDzd; `soldKg` = Σ quantityKg; `sales` = count; `avgDzdPerKg` = soldDzd / soldKg (0 if no kg). Series = soldDzd per day. Breakdown key = residue (`residueName` lots count under `other`). Top = buyers (company name) by Σ totalDzd. Activity = sales per day. Ring = Σ(quantityKg − remainingKg) / Σ quantityKg over the farm's listings that are not withdrawn-with-nothing-sold (i.e. all listings except `withdrawn` ones where remaining = quantity); null if Σ quantity = 0.
- **factory** (sales where `buyerId` = company; offers where `buyerId` = company): `spentDzd` = Σ (totalDzd + feeDzd); `boughtKg`; `offersSent` = offers created in period; `acceptRate` = accepted / (accepted + declined) among offers created in the period (0 if none); `avgDzdPerKg` = Σ totalDzd / boughtKg. Series = spentDzd per day. Breakdown by residue (DA). Top = sellers by Σ totalDzd. Activity = offers + sales per day. Ring = all-time accepted / (accepted + declined), null if none answered.
- **lab** (labRequests where `labId` = company): `requests` = created in period (any status); `released` = `releasedAt` in period; `revenueDzd` = Σ totalDzd of requests released in period; `avgTurnaroundDays` = mean of (releasedAt − receivedAt) / 1 day over requests released in period that have `receivedAt` (0 if none). Series = requests per day (by createdAt). Breakdown = analysis keys counted over requests created in period. Top = clients by Σ totalDzd of requests created in period (cancelled/declined excluded). Activity = requests per day. Ring = released with releasedAt ≤ dueAt / released with a dueAt (all time), null if none.

Previous-period values use the same definitions shifted back by `days`.

## 8. Text and Arabic

All new words live in message files (`src/components/dashboard/messages.ts` or a new `pages-messages.ts` / `insights-messages.ts`), English + Arabic, so a missing translation fails `tsc`. RTL: logical classes, arrows mirrored, numbers and charts `dir="ltr"`.

## 9. Testing and done-ness

- Backend test-first: `convex/lib/insights.test.ts` (periods, rounding, each kind) and `convex/insights.test.ts` (access, refusal, real tables through convex-test).
- All tests, both type checks, lint, `next build`.
- Chrome on dev: every page for farm, factory and lab accounts; English 1440 px and Arabic 360 px (no sideways scroll); ⌘K; avatar menu; badges; old hash links forward; guest preview on every page; analytics range switch; no console errors.

## Out of scope

Tasks, Team and Calendar pages (no data); accent colour picker (owner rule: azure/violet only); notifications; admin split into pages.

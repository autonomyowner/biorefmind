# Dashboards polish — plan (2026-10-03)

Design: `docs/superpowers/specs/2026-10-03-dashboards-polish-design.md`. Branch `dashboards-polish`.
Done in one session, one piece after another (8 GB machine, the pieces share message files).

## Part 1 — core, test-first
1. `convex/lib/pricing.ts`: `LAB_PRICE_USD`, `USD_TO_DZD`, `toDzd`, `addMonths`, `extendBase`. Tests in `convex/lib/pricing.test.ts`.
2. `admin.extendLab`, `admin.endLabPlan` with refusals; tests in `convex/accounts.test.ts`.
3. `src/lib/pricing.ts` `formatPrice(usd, currency, locale)`; vitest also runs `src/**/*.test.ts`.

## Part 2 — clients
4. Currency store + `CurrencySwitch` + `Price` (`src/components/currency.tsx`).
5. Landing pricing, FAQ, menus and sign-up cards: $100 / 25,000 DA.
6. Shared motion pieces (`FadeIn`, `Stagger`, `CountUp`), skeletons.
7. User dashboards: shell (active section, animated drawer), stat strips, lab plan card with both currencies.
8. Admin dashboard rebuilt: shell, overview, accounts, billing, requests.
9. Production: headers, robots, global error, localized dashboard error.

## Part 3 — verify
10. `npm test`, both type checks, lint, `next build`.
11. Chrome run: landing pricing switch, sign-up lab card, lab/farm/factory dashboards and admin at 1440 px and 360 px, Arabic.
12. CLAUDE.md status + memory.

## Summary
Labs will cost $100 a month, shown in dollars or dinars (25,000 DA) with a switch.
Every dashboard gets a cleaner, animated, phone-friendly look, and the admin gets a full control page.
Then everything is checked in a real browser before I call it done.

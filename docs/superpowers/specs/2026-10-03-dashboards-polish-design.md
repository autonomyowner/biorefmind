# Dashboards polish, admin dashboard, lab price and dinar prices — design (2026-10-03)

Owner's request: "polish the dashboards for the lab and everyone, create an admin dashboard, responsive,
with animations, production ready. Lab subscription $100 a month. A USD ⇄ dinar switch: $100 = 25K DA."

## Decisions (defaults taken; the owner can change them)
1. **Lab price $100/month = 25,000 DA/month.** One fixed rate, 1 USD = 250 DZD, defined once in
   `convex/lib/pricing.ts` (the website imports it). The 14-day free trial stays.
2. **Currency switch "USD | DA"**, shown where prices are: the landing pricing section, the sign-up account
   cards, the lab's plan card and the admin pages. Default: USD on English pages, DA on Arabic pages; the
   visitor's choice is remembered in the browser (`biorefmind.currency`). Text that names the price outside
   those places shows both ("$100 (25,000 DA)").
3. **Payments stay manual**: the lab pays BiorefMind directly, the admin records it. The admin gets
   "+1 month" / "+3 months" / "+12 months", a custom date, and "End plan". Extending starts from the later
   of today and the current end date (trial or paid), so a lab that pays early loses no days.
4. **Admin dashboard** (English, left to right, like before) gets the same frame as the user dashboards:
   sidebar (drawer on phones), Overview (KPI tiles, sign-ups chart, monthly lab revenue in USD/DA, labs whose
   trial or plan ends within 7 days), Accounts (search, type filter, table on desktop, cards on phones),
   Lab billing, Enterprise requests.
5. **User dashboards**: one-shot motion only (fade/slide in, count-up numbers, hover lift; no floating loops,
   reduced-motion respected), the sidebar highlights the section in view, an animated phone drawer, loading
   skeletons, and a stat strip per account type. The lab home shows the price in both currencies and what
   renewing means.
6. **Production readiness**: security headers, no `x-powered-by`, `robots.txt`, a global error page,
   localized dashboard error page, loading states.

## Backend contract (new)
- `admin.extendLab({ companyId, months })` → `{ paidUntil }`. `months` is an integer 1–12, else
  `"Choose between 1 and 12 months."`; not a lab → `"That account is not a lab."`; not admin → the admin refusal.
- `admin.endLabPlan({ companyId })` → `null`. Sets `plan: "lab_paid"`, `paidUntil: now` (the lab is hidden).
- Unchanged: `admin.overview`, `admin.setLabPaidUntil`.

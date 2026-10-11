# Plan: fresh produce, hidden-name lots, interest form, admin ready for use (2026-10-11)

Design + contract: `docs/superpowers/specs/2026-10-11-fresh-managed-admin-design.md`. Branch `fresh-managed-admin`.

## Part 1 — core (done, test-first)
- `7f5c054` backend: categories, seller fee, `adminLots`, `inquiries`, admin moderation/activity/stats. 294 tests.
- `83c49a7` shared web labels: fresh produce + corn husks (en/ar), `CATEGORY_KEYS`, `SELLER_FEE_RATE` export.

## Part 2 — in parallel (subagents, own worktrees)
- **A. Admin page** (`src/components/admin/*`, `src/app/admin/*`, `src/lib/types.ts`): overview tiles (open lots,
  new interest, fees earned both sides), Interest requests, BiorefMind lots (post with ≤3 photos, edit, sold/withdraw/
  reopen), All open lots (moderation with reason), Activity, Marketplace fees both sides, accounts CSV export,
  nav badges, `noindex` on /admin.
- **B. Public + dashboard** (`src/components/marketplace/*`, `src/components/dashboard/*`, landing/auth messages):
  category tabs + product chips, partner farm label, "I'm interested" form for BiorefMind lots (guests too), farmer's
  New listing with Residue/Fresh produce, Browse shows interest instead of offer on BiorefMind lots, farmer Sales shows
  the 5% seller fee and the net, all copy about fees updated (en/ar).

## Part 3 — integration and verification
- Merge A and B with `--no-ff`; full tests, both type checks, lint, `next build`.
- Post the three products from `farmers/` (best photos, ≤3 each) as BiorefMind lots on dev.
- Chrome run on dev: public marketplace (en 1440 / ar 360), interest form as guest → admin sees it → contacted;
  admin posts/edits/withdraws; farmer posts fresh produce; factory Browse; no console errors.
- Production: only on "ship it" (Convex prod first, then `main`).

## Summary
Farmers can now sell fresh produce as well as leftovers, and BiorefMind takes a small cut from both buyer and seller.
The products from the farmers folder go online without the farmers' names, and anyone interested can leave their number.
The admin page gets everything needed to run the business day to day: requests, lots, checks and a record of actions.

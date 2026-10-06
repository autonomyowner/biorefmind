# Lab requests and results — plan

Design and contract: `docs/superpowers/specs/2026-10-06-lab-requests-design.md` (with the expert's review applied). Branch `lab-requests`.

## Part 1 — core, test-first (done in the main session)
1. Catalog: add pectin; split contamination into heavy metals / mycotoxins / pesticides (`convex/lib/catalog.ts`); old "contamination" read as heavy metals (`normalizeServices`).
2. Pure rules `convex/lib/labwork.ts` + `labwork.test.ts`: refusal texts, units/methods/ranges, price list, sample, results (qualifiers, panels, conformity only with a limit and reference), timeouts on read, due date, sample number, verify code, lot score adapter, badge visibility.
3. Schema: lab fields on `companies`, `labRequests`, `labReports` (frozen certificate), `listings.labRequestId`.
4. Functions `convex/labwork.ts`, `labs.updateSettings`, `market.attachLabReport/detachLabReport`, lab badge in `browse`/`publicLots`, `companies.mine` returns lab settings. Backend tests `convex/labwork.test.ts` (full flow, amendments, factory sale, refusals, isolation, timeouts, lapsed lab).
5. Arabic for every new refusal (test extended). Shared website types, labels, sidebar links. Commit `0c02b0d`; `qrcode` dependency `94589ae`.

## Part 2 — website, three agents in parallel (worktrees from `94589ae`)
- **Lab workspace** (`src/components/dashboard/lab/*`, `LabHome`): month stats, work queue, request detail and actions by role, sample label with QR, results form (draft / release / amend), prices and settings, guest preview.
- **Client flow** (`src/components/dashboard/labtests/*`, `lab-directory.tsx`, `FarmHome`/`FactoryHome`): prices in the directory, request dialog, Lab tests section, attach to lot, guest preview.
- **Certificate and badges** (`src/app/verify/**`, `src/components/certificate/*`, `src/components/marketplace/lab-badge.tsx`, Browse cards): public printable certificate with QR, superseded banner, `/verify` lookup, lot badge on /marketplace and Browse, footer link.

## Part 3 — integration and verification
1. Read every diff; merge each branch `--no-ff` into `lab-requests`.
2. Whole test suite, both type checks, lint, `next build`.
3. Push functions to dev Convex; real Chrome run on dev: lab sets prices → farm requests for its lot → lab accepts, receives, prints label, inspector drafts, owner releases → certificate prints, verify code works → farm attaches → badge with score on /marketplace and Browse; amendment; Arabic RTL; 360 px; no console errors.
4. Ship (owner said "ship it"): Convex prod first (new optional fields and tables), then merge to `main` and push (Vercel). Read-only prod checks. Update CLAUDE.md and memory.

## Summary
Labs get a real workspace where clients send them paid tests and they deliver certificates.
Farmers and factories can find a lab, see its prices, send a sample and follow it to the results.
Farmers can show a lab's results on their lots so buyers trust them more.

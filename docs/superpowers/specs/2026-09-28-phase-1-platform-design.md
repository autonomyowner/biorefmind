# BioGrena Platform — Phase 1 design (2026-09-28)

Source: `proposal/BioGrena_Proposal.html` and `AI project.pdf`.

## What we are building
A multi-company B2B SaaS for valorising agricultural waste, starting with pomegranate peels. A factory or lab records each shipment (photos, supplier, weight, lab values), BioGrena scores it and routes it — **A** pharmaceutical, **B** food-grade (pectin, oils, bio-packaging), **C** low-grade (paper, fermentation, feed) — an inspector can override with a logged reason (HACCP/GMP), and the team gets analytics, an AI assistant and per-shipment PDF reports.

Phase 1 = proposal modules 1–6 + the landing page (with the Try-it demo), plus the auth and workspace basics needed to use them.

## Decisions (defaults taken, owner may change)
- **Stack:** copied from AI TRIDI's website (`D:\aitridi\aitrididibaw`, never modified): Next.js 16.3, React 19.2, Tailwind 4, shadcn `base-nova` over Base UI, `motion`, ECharts, sonner, Convex + Better Auth with the same-origin `/api/auth` proxy.
- **Theme "BioGrena Gold":** light only. Warm white paper `#fbfaf7`, ink `#16150f`, one gold accent `#b8892b` (soft `#f3e6c4`, deep `#9a7020`); leaf green and pomegranate red only as signals. Route colours: A `#2f7d4f`, B `#b8892b`, C `#8a6f5a`. Button variants `gold` and `glass`.
- **Hosting:** Vercel, as in the proposal. No Cloudflare worker.
- **Backend:** its own Convex project `biogrena-platform` (dev `grandiose-bandicoot-465`). Code in `convex/` of this repo.
- **Language:** English in Phase 1; AR/FR in Phase 2.
- **Scoring:** rules on entered lab values (the image model comes later, per proposal §6). Thresholds live in crop config.
- **AI:** OpenRouter; a rule-based fallback when no key is set.
- **PDF:** print-styled page + `window.print()`.

## Structure
- `/` landing, `/demo` try-it, `/login`, `/signup`, `/onboarding` (create workspace) — public site.
- `/dashboard` overview, `/dashboard/shipments` (list, `new`, `[id]`, `[id]/report`), `/dashboard/assistant`, `/dashboard/team`, `/dashboard/settings` — app.
- Contract: `docs/superpowers/contracts/phase-1-backend.md`.

# BiorefMind

**A marketplace for agricultural bio-waste and fresh produce, with AI quality checks, in English and Arabic.**

Farms and factories throw away peels, pomace, husks and other residues that other factories would pay for (to make extracts, pectin, packaging or energy). BiorefMind connects them. Sellers list a lot and buyers make offers. Labs on the platform test samples and issue certificates that anyone can check by QR code. Once a lab has released results, the lot gets a 0–100 quality score and a route (**A** pharmaceutical, **B** food-grade, **C** recovery). Today that scoring covers pomegranate peels only.

**Live demo:** https://biorefmind.vercel.app

## Try it (no install, no account)

| What | Link |
|---|---|
| Landing page | https://biorefmind.vercel.app |
| Public marketplace (real lots) | https://biorefmind.vercel.app/marketplace |
| Full dashboard as a guest, with sample data | https://biorefmind.vercel.app/dashboard?guest=1 |
| Check a lab certificate | https://biorefmind.vercel.app/verify |

To switch to Arabic (right to left), use the language switch in the header. You can also sign up for a free farm account to post a lot and see the AI photo check run on it.

## Features

- **Three kinds of workspace:** farm (free), lab ($100/month after a 14-day trial) and factory (enterprise).
- **Marketplace:** residues and fresh produce, offers and sales, a 5% fee on each side, and partner lots where the seller's name is hidden and buyers send an "I'm interested" request.
- **AI photo check:** when a lot is posted with photos, a vision model reports whether they match the chosen residue, whether it looks fresh or dried, and any visible problems (mould, moisture, foreign matter). It never changes the score or route, and it is always labelled "not a lab result".
- **AI lab-sheet reader:** a lab uploads a photo or PDF of a results sheet and the model fills in the results form. It never overwrites a value the analyst typed.
- **Dashboard assistant:** a streaming chat with tools for each kind of workspace (search lots, price guide, my offers, lab queue…). It can draft a listing, offer or lab result as a card the user confirms.
- **Lab requests and certificates:** a farm requests a test, the lab records results, and the certificate gets a QR code that anyone can check at `/verify`.
- **Analytics** for each workspace (ECharts), Ctrl+K command palette, and USD/DZD prices.
- **Admin console:** accounts, lab plans, interest requests, moderation, activity log, AI settings with monthly spend, and CSV export.
- **Bilingual:** every page outside `/admin` is in English and Arabic, with full right-to-left layout.

## Tech stack

| Layer | Tools |
|---|---|
| Language | TypeScript |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui on Base UI, Motion, ECharts, cmdk, sonner, qrcode |
| Backend and database | Convex (queries, mutations, actions, file storage, HTTP routes) |
| Auth | Better Auth through `@convex-dev/better-auth` |
| Validation | Zod |
| AI in the product | Claude through the Anthropic API (`@anthropic-ai/sdk`, default model `claude-haiku-5-5`) for the photo check, the lab-sheet reader and the dashboard assistant (streaming + tool use) |
| Testing | Vitest + convex-test (300 tests), ESLint, `tsc` |
| Hosting | Vercel (frontend), Convex Cloud (backend) |
| AI used to build it | **Claude Code (Claude Opus)** wrote most of the code, tests, specs and plans with the developer directing and reviewing. Every commit made with it carries a `Co-Authored-By: Claude` line. `@imgly/background-removal-node` (run locally) cut out the landing-page images. |

## Run it locally

You need Node.js 20+ and a free [Convex](https://convex.dev) account.

```bash
git clone https://github.com/autonomyowner/biorefmind.git
cd biorefmind
npm install

# 1. Create a Convex dev deployment. This writes .env.local with
#    CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL.
npx convex dev --once

# 2. Set the backend environment variables on that deployment.
npx convex env set SITE_URL http://localhost:3100
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set ADMIN_EMAILS you@example.com      # optional: who can open /admin
npx convex env set ANTHROPIC_API_KEY sk-ant-...       # optional: turns the AI features on
npx convex env set AI_MODEL claude-haiku-5-5          # optional (any claude-… model ID)

# 3. Start the site on port 3100 (it must match SITE_URL).
npx next dev -p 3100
```

Open http://localhost:3100. Without an Anthropic API key the photo check and the lab-sheet reader are off and the assistant gives rule-based answers; everything else works. Keep `npx convex dev` running in a second terminal if you change files in `convex/`.

Checks:

```bash
npm test                  # Vitest + convex-test
npx next typegen          # once, on a fresh clone, before the type check
npm run typecheck && npm run typecheck:convex
npm run lint
npm run build
```

## Project layout

```
src/app/            Next.js routes: landing, (auth), dashboard, marketplace, verify, admin
src/components/     UI: landing/, dashboard/, marketplace/, admin/, ui/ (shadcn)
src/i18n/           English/Arabic messages, locale cookie, RTL support
convex/             Backend: schema, functions, AI (ai.ts, photoCheck.ts, labAi.ts, assistant*.ts) and their tests
convex/lib/         Shared rules: accounts, catalog, pricing, AI prompts and schemas
docs/superpowers/   Design specs and implementation plans for each release
```

## Who built what

This is a solo project. One developer built it, working for BiorefMind.

| Person | Role | Built |
|---|---|---|
| **Azeddine Zellag** ([@autonomyowner](https://github.com/autonomyowner)) | Developer (solo), hired by BiorefMind | Everything in this repo: architecture, frontend, Convex backend, AI integrations, design, testing and deployment. Directed and reviewed all of Claude Code's work. |
| Claude Code (AI) | Coding assistant | Wrote most of the code, tests, translations, specs and plans under Azeddine's direction |

The product is for BiorefMind, whose CEO is **Hadjer Boulad (بولاد هاجر)**. The business model, product requirements and design references come from BiorefMind.

## License

All rights reserved.

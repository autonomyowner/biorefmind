# AI photo check — plan (2026-10-06)

Design + contract: `docs/superpowers/specs/2026-10-06-ai-photo-check-design.md`. Branch `ai-photo-check`.

## 1. Core (test-first)
1. `convex/lib/ai.ts` + `convex/lib/ai.test.ts`: `maskKey`, `cleanKey`, `cleanModel`, `parsePhotoCheck`, prompt and JSON schema, `AI_REFUSE`, constants.
2. Schema: `aiSettings`, `photoChecks`.
3. `convex/ai.ts`: admin `settings/saveKey/removeKey/update/testKey`; internal `config` (key + model for actions). Assistant switched to `config`.
4. `convex/photoCheck.ts`: internal `load/save/run`, public `retry`; `market.createListing` schedules; `myListings/browse/publicLots` return the check.
5. `convex/ai.test.ts` (fetch faked). Arabic for `AI_REFUSE` + extend the refusal test.

## 2. Website
1. `src/components/marketplace/photo-check.tsx` + `photo-check-messages.ts` (compact line + full box).
2. Shown in /marketplace card + dialog, Browse card, farmer listing card (pending / failed + Try again); guest sample gets a check.
3. Admin `src/components/admin/ai-section.tsx`, nav item "AI".

## 3. Integration and verification
Whole suite, both type checks, lint, build; push to dev Convex; real Chrome on dev (real photo → real answer, Arabic 360 px, admin AI section); review the diff; merge `--no-ff`; ship (Convex prod first with the key set, then `main`); read-only prod checks; CLAUDE.md + memory.

## Summary
First the backend that stores the AI key and checks lot photos, with tests.
Then the boxes on the lots and the admin's AI page, in English and Arabic.
Then we try it for real in a browser, and put it live.

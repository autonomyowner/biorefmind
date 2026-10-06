# AI assistant — plan (2026-10-06)

Design + contract: `docs/superpowers/specs/2026-10-06-ai-assistant-design.md`. Branch `ai-assistant`.

## 1. Core (test-first)
1. `convex/lib/assistant.ts` (+ test): `ASSIST_REFUSE`, limits, tool definitions per kind, argument cleaning, card validation shapes, system prompt, SSE line parser, `cleanAnswer`.
2. Schema: `aiThreads`, `aiMessages`, `photoClaims.source`, `aiSettings.assistant`.
3. `convex/assistantTools.ts`: internal queries for each tool (workspace from the message).
4. `convex/assistant.ts`: public functions of the contract + internal `load/write/step/finish/run`. Old BioGrena assistant code and its tests removed.
5. `market.createListing` accepts assistant photos of the same company; `ai.settings/update` gain `assistant`.
6. `convex/assistant.test.ts` with streamed OpenRouter fakes. Arabic refusals.

## 2. Website
1. Page `/dashboard/assistant`, sidebar + palette entry, messages (en/ar).
2. Chat: thread list, composer (photos), streaming message view, steps, markdown-lite, cards, retry.
3. Pre-fill from cards (`?card=<messageId>.<index>`): Listings form, Labs request dialog, Browse offer form, lab results form.
4. Admin switch + figures.

## 3. Integration and verification
Whole suite, type checks, lint, build; dev push; Chrome on dev with the real model; review agent; fixes test-first; merge `--no-ff`; ship (Convex prod first); read-only prod checks; CLAUDE.md + memory.

## Summary
First the backend that holds conversations, reads the person's data safely and talks to the AI, with tests.
Then the chat page and the forms that open already filled from the AI's suggestions.
Then we try it for real in a browser, have it reviewed, and put it live.

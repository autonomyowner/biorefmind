# Lab results reader — design (2026-10-06)

Owner, after the photo check shipped: "ok continue then ship", meaning the recommended next AI piece. Defaults below were chosen without the owner (recorded in CLAUDE.md open decisions).

## What labs get
In the results form of a received sample (release mode), a card **"Fill from a photo or PDF"**: the analyst adds up to 4 photos of the lab's own printout or worksheet, or one PDF, and presses **Read the sheet**. In ~10–20 s the form fills in:
- single values (moisture, polyphenols, punicalagin, pectin, mould, oxidation) with `<`/`>`/not-detected and ± uncertainty;
- panel lines (heavy metals, mycotoxins, pesticides): name, value, qualifier, unit;
- test dates, when printed and between receipt and today.

Filled fields are highlighted until edited. Notes from the reader ("moisture printed in g/kg, not copied") are shown above the form. A banner says: **"Read by AI — check every value against the sheet before saving."** Nothing is saved: the analyst saves a draft or releases exactly as before, with the same validation.

The reader never fills methods (the lab's own defaults stay), limits, cited references or pass/fail — conformity stays a human, cited decision (ISO/IEC 17025). It only copies values; a unit is converted only when exact (g/100 g → %).

## Rules
- Analysts and above of the lab, request status `received`. 30 readings per lab per UTC day. Admin switch "Results reader" (on by default) in `/admin#ai`; no key → off.
- Pages: 1–4 JPEG/PNG/WebP (≤ 5 MB each; the browser shrinks photos to 2000 px first) or one PDF (≤ 8 MB). The real type is read from the file's first bytes. Pages are uploaded to Convex storage, claimed for the lab (a lot photo or anything already claimed is refused, so nothing else can be read or deleted), sent to OpenRouter inline (base64), and **deleted right after** — BiorefMind keeps no copy. Refused files don't count against the day.
- Model answer is limited by a JSON schema to the analyses requested, then cleaned: unknown or twice-read analyses dropped, values within each analysis's range, text masked for phones/links, at most 5 notes (English + Arabic).
- 60 s timeout, 2 attempts. Cost is logged per reading and added to the admin's monthly AI spend.

## Contract
| Function | Who | Args | Returns |
|---|---|---|---|
| `labAi.uploadUrl` | lab analyst+ | `{ requestId }` | upload URL |
| `labAi.readResults` (action) | lab analyst+ | `{ requestId, files: Id<"_storage">[] }` | `Reading` = `{ items: {analysis, value, qualifier?, uncertainty?}[], panels: {analysis, lines: {name, value, qualifier?, unit}[]}[], testedFrom?, testedTo? ("YYYY-MM-DD"), notes: {en, ar}[] }` |
| `ai.settings` | admin | — | + `resultsReader`, `month.reads` (spend includes readings) |
| `ai.update` | admin | + `resultsReader?` | `null` |

Refusals (`READ_REFUSE`, Arabic in `backend-errors.ts`): off "The results reader is switched off."; files "Add up to 4 photos, or one PDF."; fileType "Use photos (JPEG, PNG or WebP, up to 5 MB each) or one PDF up to 8 MB."; limit "Your lab has used today's 30 readings. Please type the values or try again tomorrow."; failed "The reader couldn't read these pages. Try a clearer photo, or type the values." Plus the existing access, closed-request and missing-photo refusals.

## Testing
`convex/lib/aiRead.test.ts` (parsing, schema, prompt, uploads, type sniffing), `convex/labAi.test.ts` (convex-test, OpenRouter faked: happy path with deletion, PDF, access, switch/key/limit, failure), form merge tests in `lab-logic.test.ts`, Chrome on dev with a real printed sheet.

## Summary
Labs can photograph their results sheet and the form fills itself in.
The analyst still checks every number before anything is issued, and the pages are deleted after reading.
The admin can switch it off, and its cost shows with the rest of the AI spend.

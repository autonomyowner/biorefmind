# AI photo check on lots + admin AI settings — design (2026-10-06)

Owner's ask: "add the AI model that analyses images farmers upload… great value for labs; save the OpenRouter key in Convex and in the admin dashboard so the admin can change it." Owner chose, from the options offered: **photo check on lots first**, **public, never blocks**, **backend runs it after posting** (approach A), and "do what you recommend, polish, build, ship".

Later pieces (not in this one): suggested tests from photos, lab results reader (photo/PDF of a printout → pre-filled results form), plain-words explanation of a certificate.

## What people see

- **Farmer posts a lot with photos** exactly as today. Within ~10 s an **"AI photo check"** box appears on the lot:
  - match: "Looks like pomegranate peels" (yes) / "Hard to tell from the photos" (unsure) / "Doesn't look like <chosen residue>: looks like <what it sees>" (no);
  - state: fresh / dried / can't tell;
  - visible concerns from a fixed list: possible mould, looks wet, browning or rot, foreign matter (plastic, soil, stones), mixed residues, photos too blurry or dark;
  - one short tip for the farmer (e.g. "Take one close-up in daylight").
  - Footer, always: "AI looked at the photos — not a lab result. Order a lab test for real figures." Farmers see a link to Labs → Find a lab; others see the text only.
- **Where:** /marketplace card (one compact line) and lot dialog (full box), factory Browse (full box), farmer's My listings (full box, plus status).
- **Never blocks, never scores:** the lot is open at once; the 0–100 score and route are untouched.
- **Farmer only:** "Checking photos…" while pending; "Photo check unavailable" + **Try again** when it failed. Nothing is shown publicly unless the check is done. Lots without photos get no check.
- English and Arabic: the model writes its two free-text lines in both languages in one call; the fixed parts are translated in the website.

## Admin "AI" section (`/admin#ai`)

- **Key:** shown masked (`sk-or-…9fc9`), with its source: "Saved here", "From the server setting (OPENROUTER_API_KEY)" or "No key". Paste a new key (must start `sk-or-`, 20–200 chars) → saved; **Remove** → falls back to the server setting. The full key never leaves the backend.
- **Test key** → OpenRouter's free `/api/v1/key`: "Key works · $X used · limit $Y / no limit" or the error in plain words.
- **Model:** text box, default `google/gemini-3.8-flash`, must look like `provider/model` (≤100 chars).
- **Photo check on/off** switch (default on).
- **This month:** checks done, failed, and spend in USD (from OpenRouter's reported cost per call).
- The existing assistant uses the same key and model (saved key first, then the server setting).

## Backend

New tables:
- `aiSettings` (one row): `openrouterKey?`, `model?`, `photoCheck: boolean`, `updatedAt`, `updatedBy`.
- `photoChecks`: `listingId`, `status: "pending" | "done" | "failed" | "off"`, `result?`, `model?`, `costUsd?`, `attempts`, `retriesToday` window (`retryDay`, `retries`), `createdAt`, `finishedAt?`. Indexes `by_listing`, `by_created`.

`result` = `{ match: "yes"|"unsure"|"no", seen: {en, ar}, state: "fresh"|"dried"|"unclear", concerns: Concern[], tip: {en, ar} }`, `Concern` ∈ `mould, wet, browning, foreign_matter, mixed, poor_photo`. Free text: trimmed, ≤160 chars, phone numbers masked (`maskPhones`), unknown concerns dropped, duplicates removed. An answer that doesn't fit the shape counts as a failure.

Flow: `market.createListing` (with ≥1 photo) inserts a `pending` check and schedules `internal.photoCheck.run`. The action reads settings + lot (internal query); if the switch is off, there is no key, or today's global cap (300 checks/day) is reached → `off`. Otherwise it calls OpenRouter `chat/completions` with the photo URLs, a JSON-schema `response_format`, `usage: {include: true}`, `max_tokens 700`, up to **2 attempts**; it saves `done` with result + cost, or `failed`.

Pure logic in `convex/lib/ai.ts` (tested): `maskKey`, `cleanKey`, `cleanModel`, `parsePhotoCheck`, `photoCheckPrompt`, `PHOTO_SCHEMA`, `AI_REFUSE`, `DEFAULT_MODEL`, `DAILY_CAP`, `RETRIES_PER_DAY = 3`.

### Contract

| Function | Who | Args | Returns / effect |
|---|---|---|---|
| `market.createListing` | seller | unchanged | + schedules the check when photos exist |
| `market.myListings` | member | unchanged | + `photoCheck?: { status, result? }` |
| `market.browse`, `market.publicLots` | as today | unchanged | + `photoCheck?: PhotoCheckResult` (only when `done`) |
| `photoCheck.retry` | seller of the lot | `{ listingId }` | `null`; re-runs a `failed` check |
| `ai.settings` | admin | `{}` | `{ keySource: "saved"\|"env"\|"none", keyMasked, model, photoCheck, month: { done, failed, costUsd } }` |
| `ai.saveKey` | admin | `{ key }` | `null` |
| `ai.removeKey` | admin | `{}` | `null` |
| `ai.update` | admin | `{ model?, photoCheck? }` | `null` |
| `ai.testKey` | admin (action) | `{}` | `{ ok: true, usageUsd, limitUsd: number \| null } \| { ok: false, error }` |

Refusals (`AI_REFUSE`, all with Arabic in `backend-errors.ts`):
- `key`: "That doesn't look like an OpenRouter key (it starts with sk-or-)."
- `model`: "Write the model as provider/model, for example google/gemini-3.8-flash."
- `notFailed`: "This photo check is not waiting for a retry."
- `retries`: "You can try again 3 times a day. Please try tomorrow."
- Not the seller → existing role/farm refusals; not admin → existing admin refusal.

## Error handling

- OpenRouter down, bad key, out of credit, or a malformed answer → 2 attempts → `failed` (logged with status code only, never the key). The farmer can retry 3 times a day.
- Photos are passed as Convex storage URLs (public, unguessable); nothing else about the farm is sent (no name, region, phone, note).
- The AI's text is masked for phone numbers and length-capped before being stored.

## Testing

- `convex/lib/ai.test.ts`: key masking/validation, model validation, parsing (good answer, bad match value, unknown concerns, long text, phone in text, non-JSON).
- `convex/ai.test.ts` (convex-test, `fetch` faked at the network boundary): posting with photos → pending → scheduled run → done shows in browse/publicLots/myListings; no photos → no check; switch off / no key → off, nothing public; API failure twice → failed, retry works then limit; admin settings mask the key and never return it; non-admins refused; saved key wins over the env key; monthly figures.
- Arabic for every `AI_REFUSE` (existing test extended).
- Real Chrome on dev: post a lot with a real pomegranate-peel photo → box appears with a real model answer; Arabic 360 px; admin AI section save/test/switch.

## Summary
We will let an AI look at the photos farmers post and show a short, honest "photo check" on each lot.
The admin gets a page to change the AI key, pick the model, switch it off and see what it costs.
It never blocks a farmer or replaces a lab test, and it works in English and Arabic.

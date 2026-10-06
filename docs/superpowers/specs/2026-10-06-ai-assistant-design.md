# AI assistant in the dashboard — design (2026-10-06)

Owner: "in dashboard both for labos and farmers i need ai interface so they could upload images to it or do other stuff like ask questions … try to make something amazing". Owner chose: **farmers, labs and factories**; the assistant **prepares actions, the person confirms** in the normal forms; approach A (backend assistant with tools, streamed). Design parts 1–2 approved in chat; layout and visuals delegated.

## What people see
- Sidebar page **Assistant** (`/dashboard/assistant`, sparkle icon) right after Overview for every account; Ctrl+K "Ask the assistant".
- Empty state: greeting with the person's first name, a large composer, 4 suggestion cards per account (farm / factory / lab, listed in the messages file).
- Composer: text (≤ 2000 characters), up to 4 photos per message (button, drag-and-drop, paste; `capture` on phones). Enter sends, Shift+Enter new line.
- Answers stream in; step chips show tools used ("Looked at your 3 listings"); simple markdown (bold, lists, tables) rendered safely; copy button; `dir="auto"` per paragraph. Failed answer: "I couldn't answer right now." + **Try again**.
- **Action cards** under an answer, opening the normal form pre-filled (nothing saved by the AI):
  - `listing` (farm): residue, typed name, quantity, price, note, the chat photos → Listings with the New listing form open and filled (photos reused, no re-upload).
  - `lab_request` (farm, factory): analyses (+ lab, + lot) → Labs "Find a lab" with that lab's request dialog open and analyses ticked.
  - `offer` (factory): lot, quantity, price → Browse with the offer form open on that lot.
  - `results` (lab): request + reading → Requests with that request open and the results form filled (reader highlights).
- Conversations: list on the left (desktop), drawer on phones; rename, delete. Footer line: "AI can be wrong. It never sees anyone's phone number and never acts without you."
- English and Arabic UI; the assistant answers in the language the person writes in (Arabic, English, French, Darja understood).

## Backend
Tables:
- `aiThreads`: `companyId`, `userId`, `title`, `updatedAt` · index `by_user_company` (userId, companyId, updatedAt).
- `aiMessages`: `threadId`, `companyId`, `role` (user|assistant), `text`, `photoIds`, `steps` ({tool, detail}), `cards` (Card[]), `status` (done|streaming|failed), `costUsd?`, `createdAt` · indexes `by_thread` (threadId, createdAt), `by_company_created` (companyId, createdAt), `by_finished`? (not needed: month figures by createdAt of assistant messages).
- `photoClaims` gains optional `source: "assistant"`; such a photo can later be attached to a listing of the same company (createListing accepts it and drops `source`).
- `aiSettings.assistant?` (missing = on).

Flow: `assistant.send` → checks (member, switch + key, limits: 60 questions and 20 photos per workspace per UTC day, one answer at a time per thread) → inserts user message + empty assistant message (`streaming`) → schedules `internal.assistant.run`. The action: builds system prompt (account kind, workspace name, today's date, tool rules, safety rules), history (last 12 messages, text only; photos of the last 2 user messages inline as base64 after byte sniffing), tools for the account kind; calls OpenRouter `stream: true` with tools; writes text every ~300 ms (`internal.assistant.write`); executes tool calls via internal queries (`convex/assistantTools.ts`), adds step chips; up to 5 tool rounds; 60 s per call; finishes with cost; on error → `failed`. A stuck `streaming` message older than 3 minutes reads as failed.

Tools (pure definitions + argument cleaning in `convex/lib/assistant.ts`; data in `convex/assistantTools.ts`). All take the workspace from the stored message, never from the model:
- all: `search_lots {residue?, region?, max_price?}` (≤ 15 open lots: id, residue, kg, DA/kg, region, seller name, AI photo check summary, lab badge; notes masked and marked as quoted data), `price_guide {residue}` (count, min, median, max asking DA/kg over open lots), `lab_directory {analysis?}` (listed labs: id, name, region, price and days for the analysis), `my_sales {}`.
- farm: `my_listings {}`, `my_offers_received {}`, `my_lab_tests {}`, `propose_listing`.
- factory: `my_offers {}`, `propose_offer`.
- farm + factory: `propose_lab_request`.
- lab: `lab_queue {status?}`, `lab_month {}`, `read_sheet {request_id}` (runs the results reader on the latest user photos; counts as a reading), `propose_results`.
- Proposals are validated (catalog keys, own listing/request ids, numbers in range, photos from this thread) and stored as cards; invalid ones are dropped with a step "Suggestion skipped".
- No tool returns any phone number; text from other people is passed as quoted data; the model's text is phone-masked before saving.

Contract (public functions):
| Function | Args | Returns |
|---|---|---|
| `assistant.threads` | `{ companyId }` | `{ threadId, title, updatedAt }[]` (own, newest first, ≤ 50) |
| `assistant.messages` | `{ threadId }` | `{ messageId, role, text, photos: {storageId, url}[], steps, cards, status, createdAt }[]` |
| `assistant.uploadUrl` | `{ companyId }` | upload URL |
| `assistant.send` | `{ companyId, threadId?, text, photoIds }` | `{ threadId, messageId }` |
| `assistant.retry` | `{ messageId }` | `null` (failed assistant message → streaming again) |
| `assistant.rename` | `{ threadId, title }` | `null` |
| `assistant.remove` | `{ threadId }` | `null` (deletes messages and unused photos) |
| `assistant.card` | `{ messageId, index }` | the card with photo URLs, for the form that opens it |
| `ai.settings` / `ai.update` | + `assistant`, `month.questions` | |

Refusals (`ASSIST_REFUSE`, Arabic required): off "The assistant is switched off."; empty "Type a question or add a photo (up to 2000 characters)."; photos "Add up to 4 photos (JPEG, PNG or WebP, up to 5 MB each)."; limit "Your workspace has used today's 60 questions. Please try again tomorrow."; photoLimit "Your workspace has used today's 20 photos. Please try again tomorrow."; busy "Please wait for the current answer to finish."; noThread "This conversation no longer exists."; title "Give the conversation a name (1 to 80 characters)."; noCard "This suggestion is no longer available."

The old BioGrena `assistant.ask/messages/clear` (shipments-based, unused by any page) are replaced; the `assistantMessages` table stays in the schema (legacy data).

## Testing
Pure: tool argument cleaning, card validation, SSE parsing, markdown-lite renderer. Convex-test with OpenRouter faked (streamed chunks): plain answer, tool round (my listings), cross-workspace refusal, limits, busy, phones never in tool output, card validation, remove thread deletes photos, listing from a chat photo. Chrome on dev with the real model: farmer photo → listing card → pre-filled form → post; factory search + offer card; lab sheet → results card; Arabic 360 px; admin switch and figures.

## Summary
Every farmer, factory and lab gets an AI assistant page where they can ask questions and send photos.
It looks at their own data and the public marketplace, answers in their language, and suggests ready-filled actions.
Nothing happens until the person confirms, and phone numbers stay private.

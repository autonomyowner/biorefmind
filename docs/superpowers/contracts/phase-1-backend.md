# BioGrena — Phase 1 backend contract

Every client (public site, dashboard) builds against this. The schema is `convex/schema.ts` (already committed). Clients call functions through `api` from `src/lib/backend.ts` (untyped `anyApi` until integration) and type results with `src/lib/types.ts`.

All user-facing refusals are thrown as `ConvexError("<exact text>")` from `convex/values`. Clients show `error.data` when it is a string (helper `errorMessage(e)` in `src/lib/errors.ts`), otherwise "Something went wrong. Please try again."

Access rule for every company-scoped function: the caller must be signed in (`"Please sign in to continue."`) and a member of `companyId` (`"You don't have access to this workspace."`). Role ladder: owner > manager > inspector.

## Types (mirrored in `src/lib/types.ts`)

```ts
type Role = "owner" | "manager" | "inspector";
type Route = "A" | "B" | "C";
type Lab = { moisture?: number; mold?: number; oxidation?: number; punicalagin?: number }; // percent
type Viewer = { _id: string; email: string; name: string } | null;
type Workspace = { companyId: string; name: string; kind: "factory" | "lab"; role: Role; plan: "trial" | "tier1" | "tier2"; trialEndsAt: number };
type ScoreResult = { score: number; confidence: number; route: Route; reasons: string[] };
type ShipmentRow = { _id: string; code: string; crop: string; supplier: string; weightKg: number; receivedAt: number; score: number; confidence: number; route: Route; autoRoute: Route; overridden: boolean; thumbUrl: string | null };
type ShipmentDetail = ShipmentRow & { origin?: string; notes?: string; lab: Lab; reasons: string[]; photoUrls: string[]; createdByName: string; createdAt: number;
  overrides: { _id: string; from: Route; to: Route; reason: string; userName: string; createdAt: number }[];
  recommendations: string[] };
type Overview = { total: number; last30: number; byRoute: { A: number; B: number; C: number }; avgScore: number; avgConfidence: number; overrideRate: number;
  trend: { day: string /* YYYY-MM-DD */; count: number; avgScore: number }[];      // last 30 days, every day present
  suppliers: { supplier: string; count: number; avgScore: number; shareA: number }[]; // top 10 by count
  recent: ShipmentRow[] };                                                          // latest 5
type Crop = { key: string; name: string; unit: "%"; fields: { key: keyof Lab; label: string; hint: string }[] };
type AssistantMessage = { _id: string; role: "user" | "assistant"; content: string; createdAt: number };
type Member = { userId: string; name: string; email: string; role: Role };
type Invitation = { _id: string; email: string; role: Role; createdAt: number };
```

## Functions

### users.ts
- `users.viewer` query `{}` → `Viewer`.
- `users.ensureUser` mutation `{ name: string }` → user id. Creates the profile for the signed-in login (email from the session) or returns the existing one. Name trimmed, 1–80 chars: `"Please enter your name."`. Also accepts pending invitations for that email (creates memberships).

### companies.ts
- `companies.mine` query `{}` → `Workspace[]` (empty when signed out).
- `companies.create` mutation `{ name: string; kind: "factory" | "lab"; country?: string }` → companyId. Caller becomes owner; plan `trial`, `trialEndsAt` = now + 14 days. Name 2–80 chars: `"Company name must be 2–80 characters."`. Needs a profile: `"Please finish creating your account first."`.
- `companies.members` query `{ companyId }` → `Member[]`.
- `companies.invite` mutation `{ companyId; email; role: "manager" | "inspector" }` → invitation id. Owner/manager only: `"Only owners and managers can invite people."`. Bad email: `"Please enter a valid email address."`. Already a member: `"This person is already in your workspace."`.
- `companies.invitations` query `{ companyId }` → `Invitation[]` (pending only).
- `companies.revokeInvitation` mutation `{ invitationId }` → null. Owner/manager only.

### crops.ts
- `crops.list` query `{}` → `Crop[]`. Phase 1 returns one crop: `pomegranate_peel` ("Pomegranate peel"), fields moisture, mold, oxidation, punicalagin. Defined in `convex/lib/crops.ts` with its thresholds, so new crops are data, not code paths.

### scoring (pure: `convex/lib/scoring.ts`)
`scoreShipment(cropKey, lab) → ScoreResult`. Pomegranate-peel rules (placeholder values from the study's intent, all in `crops.ts` thresholds, flagged as "to calibrate with lab data"):
- Hard gates → **C**: mold > 5, or moisture > 20.
- Sub-scores 0–100: punicalagin (0 at ≤2 %, 100 at ≥15 %), moisture (100 at ≤10 %, 0 at ≥20 %), mold (100 at 0 %, 0 at ≥5 %), oxidation (100 at ≤10 %, 0 at ≥60 %). Weights 0.4 / 0.2 / 0.25 / 0.15. Missing values are skipped and the weights re-normalised.
- Route **A** if score ≥ 75 and punicalagin ≥ 10 and mold ≤ 1; **B** if score ≥ 50; else **C**.
- Confidence = completeness (fields present / 4) × margin factor (0.6–1.0 by distance of the score from the nearest route boundary, 10 points away = 1.0), rounded to 2 decimals. No lab values at all → score 0, route C, confidence 0.2, reason "No lab values entered — routed to C until tested."
- `reasons`: one plain-English line per deciding factor, e.g. "Punicalagin 12.4 % meets the pharmaceutical threshold (≥ 10 %)."

### shipments.ts
- `shipments.generateUploadUrl` mutation `{ companyId }` → string (any member).
- `shipments.create` mutation `{ companyId; crop; supplier; origin?; weightKg; receivedAt; photoIds: Id<"_storage">[]; lab: Lab; notes? }` → `{ shipmentId, code, result: ScoreResult }`. Any member. Validation: supplier 1–120 chars `"Please enter the supplier."`; weightKg finite > 0 `"Weight must be a positive number."`; each lab value finite 0–100 `"Lab values must be percentages between 0 and 100."`; ≤ 8 photos `"You can attach up to 8 photos."`; unknown crop `"Unknown crop."`. Code = `BG-` + 6-digit sequence per company.
- `shipments.list` query `{ companyId; route?: Route; search?: string; limit?: number }` → `ShipmentRow[]`, newest first, default limit 100 (max 500). `search` matches code or supplier, case-insensitive.
- `shipments.get` query `{ shipmentId }` → `ShipmentDetail | null` (null when not found or not the caller's company).
- `shipments.override` mutation `{ shipmentId; to: Route; reason: string }` → null. Owner, manager or inspector (all roles). Reason 5–500 chars: `"Please give a reason for the change (at least 5 characters)."`. Same route: `"The shipment is already on that route."`. Writes `routeOverrides`, sets `route`, `overridden = route !== autoRoute`.
- `shipments.remove` mutation `{ shipmentId }` → null. Owner/manager only: `"Only owners and managers can delete shipments."`. Deletes photos and overrides.

### analytics.ts
- `analytics.overview` query `{ companyId }` → `Overview`.

### assistant.ts
- `assistant.messages` query `{ companyId }` → `AssistantMessage[]` (caller's thread, oldest first, last 50).
- `assistant.ask` action `{ companyId; question: string }` → `{ answer: string }`. Question 1–2000 chars: `"Please type a question."`. Stores the question and the answer. Context sent to the model: a short BioGrena/routing system prompt, the crop thresholds, `analytics.overview` numbers and the latest 20 shipments. Calls OpenRouter (`OPENROUTER_API_KEY`, model `AI_MODEL`, default `anthropic/claude-sonnet-5`). **Without a key**, answers from a built-in rule-based responder (summary of the numbers + routing rules) so the demo always works.
- `assistant.clear` mutation `{ companyId }` → null.

### demo.ts (public, no auth)
- `demo.score` query `{ lab: Lab }` → `ScoreResult` (same engine, crop pomegranate_peel). Values out of range: `"Lab values must be percentages between 0 and 100."`.

### seed.ts
- `seed.demoData` mutation `{ companyId }` → `{ created: number }`. Owner only. Adds 40 realistic pomegranate-peel shipments over the last 30 days from 6 suppliers, with a few overrides. For the committee demo.

## Refusals added during the build (2026-09-28)
- `seed.demoData` by a non-owner: `"Only the workspace owner can add demo data."`
- `shipments.override` / `shipments.remove` on a missing shipment **or one of another company**: `"This shipment no longer exists."` (the same answer for both, as `get` returns null for both).
- `shipments.create` with a photo that is missing or already attached to a shipment: `"One of the photos could not be found. Please upload it again."` A photo belongs to one shipment only (`photoClaims`), because deleting a shipment deletes its photos.
- `shipments.create` with a non-finite `receivedAt`: `"Please enter the date received."`
- `companies.revokeInvitation` on a missing invitation: `"This invitation no longer exists."`; its role refusal reuses `"Only owners and managers can invite people."`
- `shipments.get` throws `"Please sign in to continue."` when signed out.

## Reports
The per-shipment PDF is a print-styled page in the dashboard (`/dashboard/shipments/[id]/report`) using `shipments.get`; "Download PDF" calls `window.print()`. No backend function needed.

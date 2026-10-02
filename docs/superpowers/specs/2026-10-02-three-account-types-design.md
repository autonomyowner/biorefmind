# BiorefMind — three account types (piece 1 of 4) — design (2026-10-02)

## Why
The client wants three kinds of users in the SaaS:
1. **Farmers** sell what is left of their harvest (peels, husks, pomace…). Free for them.
2. **Labs** run the analyses. They pay **$30/month** to list their services, and can be linked to farmers and to factories that need them.
3. **Factories** buy residues and use labs. **Custom (enterprise) pricing.**

## Decisions (owner, 2026-10-02)
| Topic | Decision |
|---|---|
| Money in the first version | **Outside the platform.** Deals are agreed and recorded on BiorefMind; the factory pays the farmer directly. The platform tracks what is owed and BiorefMind invoices it. Online payment comes later. |
| Who pays the 5% | **The factory (buyer)**, on top of the agreed price. The farmer gets the full price and pays nothing. |
| Factories selling | **Buy only for now.** The "Factories → Factories" market leaves the website. |
| Farmer login | **Email + password** (the existing login), **phone number required**. Phone/SMS login may come later. |
| Lab plan | **14-day free trial**, visible to everyone during it; afterwards hidden until an admin marks the lab as paid. The lab can still sign in. |
| Account model | **Approach A:** every account is a workspace with a kind — `farm`, `lab` or `factory`. |

## The four pieces (each gets its own design → plan → build)
1. **Three account types** (this document): sign-up per type, profiles, a dashboard per type, the lab directory, an admin page, website pricing.
2. **Marketplace:** farmers list residues; factories browse and make offers; an accepted offer becomes a recorded sale with the 5% buyer fee.
3. **Lab services:** farmers and factories request an analysis from a listed lab; the lab enters results, which feed the existing quality score.
4. **Billing:** monthly statements of fees owed (5% buyer fees, lab subscriptions), marking them paid; online payment later.

## Piece 1 in detail

### Data model (`convex/schema.ts`)
`companies` gains a third kind and the profile fields every type needs:
- `kind`: `"farm" | "lab" | "factory"`.
- `region: string` (wilaya / area, 2–80 chars), `phone: string`.
- `services?: string[]`: labs only, keys of the analyses offered (from a fixed list in `convex/lib/catalog.ts`: moisture, polyphenols, punicalagin, mold, oxidation, contamination).
- `buys?: string[]`: factories only, residue keys they are interested in (fixed list in the same file: pomegranate peels, citrus peels, olive pomace, tomato skins & seeds, grape marc, date pits, corn silk).
- `plan`: `"free"` (farms) | `"lab_trial"` | `"lab_paid"` | `"enterprise"` (factories). `trialEndsAt?: number` (labs), `paidUntil?: number` (labs).
- The old `plan` values (`trial`, `tier1`, `tier2`) and the required `shipmentSeq` stay valid so the existing shipment code keeps working; new rows don't use the old plan values.

New table `enterpriseRequests`: `{ companyId, userId, message (1–1000 chars), createdAt }`, written when a factory asks for pricing.

The dev deployment holds only test accounts; existing rows are cleared before the schema change. There is no production data yet.

### Rules (pure, unit-tested, `convex/lib/accounts.ts`)
- `labListed(company, now)`: `true` when the kind is lab and either `plan === "lab_paid" && paidUntil > now` or `plan === "lab_trial" && trialEndsAt > now`.
- `isAdmin(email)`: the email is in the comma-separated Convex env var `ADMIN_EMAILS` (lowercased, trimmed).

### Backend functions (the contract for the website)
| Function | Args | Returns | Refusals (exact text) |
|---|---|---|---|
| `companies.create` (mutation) | `{ kind, name, region, phone, services?, buys? }` | `companyId` | `"Please sign in."` · `"Please finish creating your account first."` · `"Name must be 2–80 characters."` · `"Please enter your region."` · `"Please enter a phone number."` (7–20 digits after removing spaces, `+`, `-`) · `"Choose at least one analysis your lab offers."` (lab, empty `services`) · `"You already have a farm account."` (a user may own one farm) |
| `companies.mine` (query) | `{}` | `[{ companyId, name, kind, role, region, phone, services?, buys?, plan, trialEndsAt?, paidUntil?, listed? }]` (`listed` only for labs) | — (signed out → `[]`) |
| `companies.updateProfile` (mutation) | `{ companyId, name?, region?, phone?, services?, buys? }` | `null` | access refusals as today · the same field refusals as `create` |
| `companies.invite` (existing) | unchanged | unchanged | new: `"Farm accounts are for one person."` when the workspace is a farm |
| `labs.directory` (query) | `{ service? }` | `[{ companyId, name, region, phone, services }]` listed labs only, newest first, max 100 | `"Please sign in."` |
| `enterprise.request` (mutation) | `{ companyId, message }` | `null` | `"Only factory accounts can request enterprise pricing."` · `"Please write a short message (up to 1000 characters)."` |
| `admin.overview` (query) | `{}` | `{ accounts: [{ companyId, name, kind, ownerEmail, region, phone, plan, trialEndsAt?, paidUntil?, listed?, createdAt }], requests: [{ company, email, message, createdAt }] }` | `"Only BiorefMind admins can do this."` |
| `admin.setLabPaidUntil` (mutation) | `{ companyId, paidUntil }` | `null` | `"Only BiorefMind admins can do this."` · `"That account is not a lab."` |
| `users.viewer` (existing) | — | adds `isAdmin: boolean` | — |

Every argument is validated on the server; ownership and membership use the existing `lib/access.ts` checks.

### Website
- **Sign-up (`/signup`) and onboarding (`/onboarding`):** step 1 is "I am a…" with three cards (Farmer · Lab · Factory, each with one line on what it gets and what it costs). Step 2 is the form for that type: name, farm/lab/company name, region, phone; labs also tick the analyses they offer; factories tick what they buy; then email and password on `/signup`. English and Arabic, same frosted style as the current sign-in pages.
- **Dashboard (`/dashboard`), one home per type.** It becomes bilingual (English/Arabic, right to left) for these new screens, because farmers mostly use Arabic.
  - **Farmer:** a profile card; "My listings" (empty state: "Listing opens soon"); a note "Free for farmers: buyers pay the 5% platform fee"; "Labs near you" (the lab directory).
  - **Lab:** the public profile as others see it (name, region, phone, analyses) with an Edit button; plan status ("Free trial: 9 days left", "Paid until 30 Nov", or "Hidden: trial ended. Contact BiorefMind to activate."); requests (empty until piece 3).
  - **Factory:** "Browse residues" (empty until piece 2); the lab directory with a filter by analysis; an "Enterprise pricing" card with a message box that sends `enterprise.request` and confirms with "Thanks, we'll contact you."
  - The sidebar shows only that type's sections; guest preview (`?guest=1`) shows the farmer home with sample content.
- **Admin (`/admin`):** only for admins (others see "Page not found"). A table of all accounts (type, name, owner email, region, phone, plan status) with a "Mark paid until…" date control on labs, and the list of enterprise requests. English only.
- **Landing page:**
  - The marketplace section shows the three account types: farmers sell, factories buy, labs analyse.
  - Every "Factories → Factories" mention is removed.
  - Pricing becomes Farmers: Free (buyers pay 5%) · Labs: $30/month (14-day free trial) · Factories: Custom.
  - The header menu, the FAQ ("Who can sell?", "How do deals close?") and the sign-up perks are updated to match.

### Error handling
- Backend refusals are `ConvexError` with the exact texts above, shown in toasts or under the field. The Arabic for each is added to `src/i18n/backend-errors.ts`.
- If the admin email list is unset, nobody is an admin: the page says "Page not found" and nothing is exposed.

### Testing
- **Unit:** `labListed` (trial running, trial over, paid, paid expired, not a lab), `isAdmin` (unset, case, spaces).
- **Backend (`convex-test`):**
  - each kind is created with its fields, and every refusal in the table is checked;
  - a second farm is refused, and an invite into a farm is refused;
  - the lab directory hides expired trials and shows paid labs;
  - admin functions refuse non-admins and work for admins;
  - an enterprise request is refused for non-factories.
  - The existing 33 tests keep passing.
- **Browser (real Chrome):**
  - sign up once as each type in English, and once as a farmer in Arabic;
  - each dashboard shows the right home;
  - the admin marks a lab paid and it appears in the directory;
  - no sideways scroll at 360 px.

## Out of scope for piece 1
Listings, offers, sales, lab requests, statements and payments (pieces 2–4); phone/SMS login; factories selling.

## Open questions for the client
1. The contact for enterprise pricing: should requests also reach an email address or WhatsApp number, besides the admin page?
2. Which emails are admins (`ADMIN_EMAILS`)?
3. The list of analyses labs can offer, and the list of residues, are our first draft (above); please confirm or correct.

## Summary
We will let people join BiorefMind as a farmer, a lab or a factory, each with its own sign-up and home screen.
Farmers stay free, labs get a two-week trial before their $30 plan, and factories can ask for a custom price.
You get a simple admin page to see everyone and switch labs on when they pay.

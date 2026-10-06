# Lab requests and results (lab SaaS, piece 1) — design

Date: 2026-10-06. Branch `lab-requests`. The owner delegated the domain decisions to a lab-operations expert (Opus subagent, Algerian agri-food labs, ISO/IEC 17025); this design is built from that brief.

## Why
A lab pays 25,000 DA a month and today gets only a directory line. Labs renew software they use every day. Piece 1 makes BiorefMind the place where a lab **receives paid work, tracks samples, enters results and issues certificates**, and where those results raise the value of marketplace lots.

Later pieces (not here): team plans (Solo / Team / Network, seats, formal sign-off), lab extras (client list, invoices, accreditation, branded/server PDF), French, billing, notifications.

## Decisions
1. **Fixed price list.** Each lab prices every analysis it offers (DA per sample) with a turnaround in working days. No quotes. Prices are shown to signed-in users only.
2. **Who requests.** A farm, for one of its own lots or with no lot. A factory, for a lot it bought (a sale) or with no lot. One request = one sample + one or more analyses.
3. **Sample delivery.** The client drops the sample at the lab or sends it by courier (optional tracking number). The form records residue, the client's sample label, state (fresh / dried / frozen), collection date, region, grams sent, packaging, notes, and tells the client how much to send (≥ 300 g dried, ≥ 1 kg fresh; fresh chilled, at the lab within 48 h). The lab chooses methods.
4. **Lab profile additions:** street address, opening hours, sample retention text (default "30 days"), a "pause new requests" switch, the price list.
5. **Lifecycle:** `requested → accepted | declined`; `accepted → received`; `received → released`; `cancelled`. Declining needs a reason. The client may cancel while `requested` or `accepted`. After receipt the lab may cancel only as "sample unsuitable" with a reason. Receiving assigns the lab sample number and the due date (received + the longest turnaround, in calendar days ×7/5 rounded up). Timeouts are computed when read (no scheduled jobs): `requested` older than 7 days → **expired**; `accepted` with no sample after 30 days → **expired**; `requested` at a lab that is no longer listed → **lab unavailable**. Closed states refuse every action.
6. **Results** are stored as the lab reports them: value + unit (fixed per analysis) + method (pre-filled, editable) + optional uncertainty ±U; contamination is a list of named parameters (value, unit, optional limit, pass/fail). Dates tested and optional deviations. Released results are never edited: an **amendment** creates version 2 with a reason, and version 1's certificate says it was replaced.
7. **Analysis catalog:** add **pectin**. Units: moisture % (wet basis), polyphenols mg GAE/g DM, punicalagin mg/g DM, pectin % DM, yeasts & moulds log₁₀ CFU/g, oxidation (peroxide value) meq O₂/kg, contamination as parameters.
8. **Certificate of analysis** = a public printable web page `/verify/<code>` (browser print → PDF) with a QR code to itself. Content follows ISO/IEC 17025 §7.8.2: title, lab name and address, report number, client name, sample description and condition on arrival, lab sample number, dates received / tested / issued, method per result, results with units (and ±U), deviations, name and role of the person who released it, sample retention, and the statements "Results apply only to the sample as received. Sampling was done by the customer." and "This certificate may not be reproduced except in full." The code is random and unguessable (holding it = permission). **The certificate never shows the BiorefMind score or route.** Deferred: logo, signature image, accreditation marks, pass/fail against client specs, server-made PDF.
9. **Visibility.** Results are private to the client and the lab. Only a farm can publish, and only on its own lot: "Attach to lot" on a released request about that lot. Then the lot shows a badge to everyone ("Lab-tested by <lab>, <date>", plus score and route for pomegranate peels) and signed-in users get the certificate link. A factory's results are never published. The badge disappears 90 days after release or when the lot closes. Every badge carries "Results apply only to the sample tested; score by BiorefMind, not by the lab."
10. **Money.** The client pays the lab directly (cash, CCP, BaridiMob, purchase order). No BiorefMind fee per request. The lab has a private paid/unpaid tick per request.
11. **Which labs take requests:** listed (trial running or paid), not paused, and only for analyses they have priced. When a plan lapses, waiting requests show "lab unavailable"; accepted/received work stays workable to release; certificates stay verifiable forever.
12. **Roles inside the lab:** owner/manager accept, decline, edit settings, release, amend, reject, mark paid. Inspector (analyst): mark received, save draft results. This is the analyst → head flow in its simplest form.
13. **Scoring** (pomegranate peels only; others show "lab-tested" without a score), computed at release and stored on the report, using the existing engine unchanged (old shipments keep their meaning) through an adapter: punicalagin mg/g ÷ 10 → %; moisture used only for **dried** samples (fresh peel is wet by nature); yeasts & moulds log₁₀ CFU/g → engine mould scale `max(0, (log − 3) × 2.5)` (so 5 log hits the engine's > 5 gate → C; ≤ 3.4 log can reach A); oxidation not used; any failed contamination parameter → route C with a reason. All thresholds remain placeholders to calibrate (open decision 1).

## Expert review (applied 2026-10-06)
The expert reviewed this design and asked for these changes; they override anything above:
1. **Certificates are frozen when issued:** `labReports` stores its own copy of the lab's name/address/phone, the client's name and region, the sample, sample number, condition, received date and retention. Profile edits never change an issued certificate.
2. **Qualifiers:** each result and panel line may carry `qualifier: "<" | ">" | "nd"` (not detected). Scoring reads "<x" as x and "nd" as 0.
3. **Moulds are entered in CFU/g** (range 0–1e9); log₁₀ is worked out only for scoring. The engine's gate is "> 5", so exactly 5 log passes and only above 5 log goes to C.
4. **Contamination is split** into three priced panel analyses: `heavy_metals`, `mycotoxins`, `pesticides`, each a list of lines (name, value, qualifier, unit, limit, limitRef, pass). Labs that ticked "contamination" read as `heavy_metals` (`normalizeServices`).
5. **Conformity (§7.8.6):** `pass` is kept only when the line has a `limit` and a `limitRef`; the certificate then prints "Conformity is assessed against the stated limit without taking measurement uncertainty into account."
6. **The lab can cancel an accepted request** before the sample arrives (`labwork.reject` accepts `accepted` and `received`).
7. **A late sample can still be received:** `receive` works on any stored `accepted` request, even after the 30-day wait; `respond` refuses expired requests.
8. **Certificate print:** report number and "page x of y" on every page, "End of report", the client's region, a large "Superseded — replaced by <code>" banner on old versions, footer "Issued by <lab>. BiorefMind hosts this certificate and did not perform the analysis." Never the client's phone.
9. Frozen samples count as fresh for scoring (moisture ignored).
10. New refusals: `collectedFuture`, `testedOrder` (replaces `tested`), `listingClosed`, `dueAt`; role refusals on `respond`, `reject`, `amend`, `setPaid`; client actions (`cancel`, `setTracking`) need owner/manager of the client.
11. **Due date:** shown as "due around"; the lab may set `dueAt` at receipt (holidays, Ramadan hours), within 180 days.
12. Value ranges: moisture 0–100, pectin 0–100, polyphenols 0–500, punicalagin 0–300, moulds 0–1e9 CFU/g, peroxide 0–200; uncertainty ≥ 0.
13. Known gap: there is no admin "block lab" or badge removal; a fraudulent lab's badges stay until the lot closes or 90 days pass. The score is not printed or stored as reasons (English-only text); reports keep `score` and `route` only.

## Lab dashboard (bilingual)
1. **Work queue** with tabs New · Awaiting sample · In lab · Done, counts, due dates, an Overdue flag.
2. **Request detail**: client name and phone (the client shared them by requesting), sample details, analyses and total, actions for the current state, the lab's paid tick.
3. **Sample label**: lab sample number with a QR code, printable, to stick on the bag.
4. **Results form**: one row per analysis with unit and pre-filled method; contamination rows; save draft / release; after release, link to the certificate and "Amend".
5. **Prices & settings**: price + turnaround per analysis offered, address, hours, retention, pause switch.
6. **This month**: requests received, released, on-time %, DA requested vs DA marked paid.

## Client side (farm and factory, bilingual)
- The lab directory shows each lab's prices, turnaround, address and hours, and a **Request analysis** button (disabled with "Not taking requests right now" when paused).
- The request dialog: analyses with prices and total, the lot/sale it is about (optional), the sample form, delivery.
- **Lab tests** section: my requests with status, lab contact, cancel, courier tracking, certificate links; for a farm, "Attach to lot" / "Remove from lot".

## Backend contract
Refusal texts are exact (the website translates them; every one gets Arabic in `src/i18n/backend-errors.ts`).

### Data
- `companies` gains (labs, all optional): `address`, `hours`, `retention`, `paused: boolean`, `prices: [{ analysis, priceDzd, days }]`, `requestSeq: number`.
- `listings` gains `labRequestId?: Id<"labRequests">`.
- `labRequests`: `labId`, `clientId`, `clientKind: "farm"|"factory"`, `listingId?`, `saleId?`, `analyses: [{ analysis, priceDzd, days }]` (snapshot), `totalDzd`, `sample: { residue, residueName?, label, state: "fresh"|"dried"|"frozen", collectedAt, region, grams, packaging? , notes? }`, `delivery: "dropoff"|"courier"`, `tracking?`, `status: "requested"|"accepted"|"declined"|"received"|"released"|"cancelled"`, `reason?`, `cancelledBy?: "client"|"lab"`, `respondedAt?`, `sampleNo?`, `receivedAt?`, `dueAt?`, `condition?`, `draft?: Results`, `releasedAt?`, `reportId?` (current), `paid: boolean`, `createdBy`, `createdAt`. Indexes `by_lab [labId, createdAt]`, `by_client [clientId, createdAt]`.
- `labReports`: `requestId`, `labId`, `version`, `code` (verify code), `reportNo` (`<sampleNo>-R<version>`), `results: Results`, `releasedByName`, `releasedByRole`, `amendReason?`, `replacedBy?: Id<"labReports">`, `score?`, `route?`, `reasons?`, `releasedAt`. Indexes `by_code`, `by_request`.
- `Results = { items: [{ analysis, value, uncertainty?, method }], parameters?: [{ name, value, unit, limit?, pass }], testedFrom, testedTo, deviations? }`.
- Sample number `S-<year>-<0001>` per lab (from `requestSeq`). Verify code: 12 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, random.

### Pure rules — `convex/lib/labwork.ts`
`LAB_REFUSE` (texts below), `ANALYSIS_SPECS` (unit, default method, value range), `cleanPrices`, `cleanSample`, `cleanResults(results, analyses)`, `effectiveStatus(req, now, labOpen)` → status | `"expired"` | `"lab_unavailable"`, `dueDate(receivedAt, days)`, `sampleNo(year, seq)`, `verifyCode()`, `lotScore(residue, state, results)` → `{ score, route, reasons } | null`, `badgeVisible(listing, report, now)`.

### Functions
| Function | Args | Returns | Refusals (besides sign-in / no access) |
|---|---|---|---|
| `labs.updateSettings` (m) | `{ companyId, address, hours, retention, paused, prices }` | `null` | `notLab` · `role` · `address` · `hours` · `retention` · `price` · `days` · `priceService` |
| `labs.directory` (q) | `{ service? }` | adds `address`, `hours`, `paused`, `prices` | — |
| `labwork.request` (m) | `{ clientId, labId, analyses, listingId?, saleId?, sample, delivery, tracking? }` | `requestId` | `clientKind` · `role` · `labClosed` · `labPaused` · `analyses` · `notPriced` · `notYourLot` · `notYourSale` · `label` · `state` · `collected` · `grams` · `packaging` · `notes` · `tracking` (+ residue/region refusals reused) |
| `labwork.cancel` (m) | `{ requestId }` | `null` | `closed` · `tooLate` |
| `labwork.setTracking` (m) | `{ requestId, tracking }` | `null` | `closed` · `tracking` |
| `labwork.respond` (m) | `{ requestId, accept, reason? }` | `null` | `closed` · `reason` · `labClosed` |
| `labwork.receive` (m) | `{ requestId, condition? }` | `null` | `closed` · `condition` |
| `labwork.reject` (m) | `{ requestId, reason }` | `null` | `closed` · `reason` |
| `labwork.saveDraft` (m) | `{ requestId, results }` | `null` | `closed` · result refusals |
| `labwork.release` (m) | `{ requestId, results }` | `code` | `closed` · result refusals · `role` |
| `labwork.amend` (m) | `{ requestId, results, reason }` | `code` | `notReleased` · `reason` · result refusals |
| `labwork.setPaid` (m) | `{ requestId, paid }` | `null` | `role` |
| `labwork.labQueue` (q) | `{ companyId }` | rows (below) | — |
| `labwork.myRequests` (q) | `{ companyId }` | rows (below) | — |
| `labwork.certificate` (q, no auth) | `{ code }` | certificate or `null` | — |
| `market.attachLabReport` (m) | `{ listingId, requestId }` | `null` | `notReleased` · `notThisLot` · `closed` (listing) |
| `market.detachLabReport` (m) | `{ listingId }` | `null` | — |
| `market.browse` / `market.publicLots` | — | rows gain `lab?: { labName, releasedAt, score?, route? }`; `browse` also `lab.code` | — |

Queue row: `{ requestId, status (effective), overdue, clientName, clientPhone, clientRegion, clientKind, analyses, totalDzd, sample, delivery, tracking?, sampleNo?, receivedAt?, dueAt?, condition?, reason?, draft?, reports: [{ code, version, reportNo, releasedAt, amendReason? }], paid, createdAt }`.
My-requests row: `{ requestId, status (effective), labId, labName, labPhone, labAddress, labHours, analyses, totalDzd, sample, delivery, tracking?, listingId?, saleId?, sampleNo?, dueAt?, reason?, reports: [...], attached: boolean, createdAt }`.
Certificate: `{ code, reportNo, version, replacedByCode?, amendReason?, lab: { name, address, phone }, clientName, sample, sampleNo, condition?, receivedAt, testedFrom, testedTo, releasedAt, releasedByName, releasedByRole, retention, results }`.

### Refusal texts (`LAB_REFUSE`)
- `notLab`: "That account is not a lab."
- `role`: "Only owners and managers can do this."
- `address`: "The address can be up to 200 characters."
- `hours`: "Opening hours can be up to 120 characters."
- `retention`: "The retention note can be up to 80 characters."
- `price`: "Each price must be a whole number of dinars (1 to 1,000,000)."
- `days`: "Turnaround must be 1 to 90 working days."
- `priceService`: "You can only price analyses your lab offers."
- `clientKind`: "Only farm and factory accounts can request analyses."
- `labClosed`: "This lab is not taking requests."
- `labPaused`: "This lab has paused new requests."
- `analyses`: "Choose at least one analysis."
- `notPriced`: "This lab has no price for one of the analyses you chose."
- `notYourLot`: "You can only request an analysis for your own lot."
- `notYourSale`: "You can only request an analysis for a lot you bought."
- `label`: "Give the sample a name (2 to 80 characters)."
- `state`: "Choose fresh, dried or frozen."
- `collected`: "Enter the date the sample was collected."
- `grams`: "Enter how many grams you are sending (1 to 100,000)."
- `packaging`: "Packaging can be up to 80 characters."
- `notes`: "Notes can be up to 1000 characters."
- `tracking`: "The tracking number can be up to 60 characters."
- `noRequest`: "This request no longer exists."
- `closed`: "This request is no longer open."
- `tooLate`: "The lab has the sample already; ask the lab to cancel."
- `reason`: "Please give a reason (up to 500 characters)."
- `condition`: "The condition note can be up to 500 characters."
- `results`: "Enter a result for every analysis requested."
- `value`: "One of the results is not a valid number."
- `method`: "Each method must be 2 to 120 characters."
- `parameter`: "Each contamination line needs a name, a value and a unit."
- `tested`: "Enter valid test dates."
- `deviations`: "Deviations can be up to 1000 characters."
- `notReleased`: "These results have not been released yet."
- `notThisLot`: "These results are not about this lot."

## Testing
- Unit (`convex/lib/labwork.test.ts`): every clean function's limits, `effectiveStatus` (each timeout, lab unavailable), `dueDate`, `sampleNo`, `verifyCode` alphabet, `lotScore` (punicalagin conversion, fresh vs dried moisture, mould log mapping, failed contamination → C, other residues → null), `badgeVisible` (90 days, closed lot).
- Backend (`convex/labwork.test.ts`): full flow farm → lab (request with lot → accept → receive → draft by inspector → inspector cannot release → release → certificate public → attach → badge in publicLots with score; factory sees code in browse; guest does not); factory with sale; every refusal path listed above; amendment chain (v1 replaced by v2, both verifiable); paused/unlisted lab; timeouts via fake time; client cannot see other clients' requests; lab cannot see other labs' queues.
- Every new refusal has Arabic (existing test covers `backend-errors.ts`).
- Real Chrome on dev: farm requests → lab works it in the dashboard → certificate prints → attached badge on /marketplace; Arabic RTL; 360 px; no console errors.

## Risks
- No notifications yet: labs may miss requests (7-day expiry). Next most important follow-up (open decision 14).
- Score thresholds are placeholders; the badge says the score is BiorefMind's.
- A farm could attach results from another batch; mitigated by the disclaimer and 90-day expiry.
- Fake labs could issue certificates: the admin should check a lab's registration before marking it paid.

## Summary
Labs get a real workspace: clients send them paid analysis requests, they track each sample and enter the results.
Each result becomes a printable certificate anyone can check with a code, and farmers can show it on their lot.
Farms and factories can find a lab, see its prices, send a sample and follow it until the results arrive.

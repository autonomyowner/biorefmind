# Marketplace (piece 2) — design

Date: 2026-10-04. Owner's request: "finish the marketplace part where farmers could post what they're selling, end to end".
Parent design: `2026-10-02-three-account-types-design.md` (piece 2: "farmers list residues; factories browse and make offers; an accepted offer becomes a recorded sale with the 5% buyer fee").

## The flow
1. **A farmer posts a lot:** residue (from the catalog), quantity in kg, asking price in DA per kg, region (defaults to the farm's), an optional note, and up to 4 photos.
2. **Factories browse** the open lots, filtered by residue. They see the farm's name and region, never its phone.
3. **A factory makes an offer:** quantity (all or part of what is left), price in DA per kg, optional message. One pending offer per factory per lot; offering again replaces it. The factory can withdraw a pending offer.
4. **The farmer accepts or declines.** Accepting records a **sale**: quantity × price = total; BiorefMind's fee is 5% of the total, paid by the buyer on top. The lot's remaining quantity goes down; at 0 the lot is sold, and pending offers that no longer fit are declined automatically.
5. **After a sale, both sides see each other's name and phone** to arrange pickup and payment. Before that, contact stays hidden so deals go through the platform.
6. The farmer can withdraw an open lot (its pending offers are declined).
7. **Admins** see every sale and the total fees owed (billing them is piece 4).

## Defaults chosen (recorded as open decisions)
- Prices are in **dinars per kg only** (no USD switch: per-kg dollar amounts are tiny and farmers price in DA).
- Fee 5% (`MARKET_FEE_RATE` in `convex/lib/pricing.ts`, still the draft rate). Fee rounded to the nearest dinar.
- Partial offers allowed.
- **No quality score on lots yet:** the score needs lab values, which arrive with piece 3 (lab services).
- Only farms sell; only factories buy (labs neither).
- Farm accounts are one person, so "owner or manager" of the farm = its owner. Factory inspectors can browse but only owners/managers make offers.

## Data
- `listings`: companyId (farm), residue, quantityKg (original), remainingKg, priceDzdPerKg, region, note?, photoIds, status `open | sold | withdrawn`, createdBy, createdAt. Indexes `by_status` (status, createdAt), `by_company` (companyId, createdAt).
- `offers`: listingId, sellerId (farm company), buyerId (factory company), quantityKg, priceDzdPerKg, message?, status `pending | accepted | declined | withdrawn`, createdBy, createdAt, respondedAt?. Indexes `by_listing`, `by_buyer`.
- `sales`: listingId, offerId, sellerId, buyerId, residue, quantityKg, priceDzdPerKg, totalDzd, feeDzd, createdAt. Indexes `by_seller`, `by_buyer`, `by_created`.
- Listing photos reuse `photoClaims` (each upload attachable once, to its own company).

## Contract (`convex/market.ts`, all refusals English, translated on the website)
| Function | Args | Returns |
|---|---|---|
| `market.generateUploadUrl` (mutation) | companyId | upload URL (farm members only) |
| `market.createListing` (mutation) | companyId, residue, quantityKg, priceDzdPerKg, region?, note?, photoIds | listingId |
| `market.withdrawListing` (mutation) | listingId | null |
| `market.myListings` (query) | companyId | `MyListing[]`: listing fields + `photoUrls`, `offers` (pending first: offerId, buyerName, buyerRegion, quantityKg, priceDzdPerKg, totalDzd, message, status, createdAt) |
| `market.browse` (query) | residue? | `MarketListing[]`: listingId, residue, remainingKg, priceDzdPerKg, region, note, photoUrls, sellerName, createdAt (open lots, newest first, up to 100) |
| `market.makeOffer` (mutation) | companyId, listingId, quantityKg, priceDzdPerKg, message? | offerId |
| `market.withdrawOffer` (mutation) | offerId | null |
| `market.respond` (mutation) | offerId, accept | `{ saleId }` on accept, `{ saleId: null }` on decline |
| `market.myOffers` (query) | companyId | `MyOffer[]`: offerId, listingId, residue, sellerName, sellerRegion, quantityKg, priceDzdPerKg, totalDzd, status, createdAt, listingStatus |
| `market.mySales` (query) | companyId | `Sale[]`: saleId, residue, quantityKg, priceDzdPerKg, totalDzd, feeDzd, side `sold | bought`, otherName, otherRegion, otherPhone, createdAt |
| `admin.sales` (query) | — | `{ count, totalDzd, feeDzd, recent: { saleId, residue, quantityKg, totalDzd, feeDzd, seller, buyer, createdAt }[] }` |

Refusals, word for word:
- "Only farm accounts can list residues."
- "Only factory accounts can make offers."
- "Choose a residue from the list."
- "Quantity must be a whole number of kilograms (1 to 10,000,000)."
- "Price must be between 0.01 and 100,000 DA per kg."
- "The note can be up to 1000 characters."
- "You can attach up to 4 photos."
- "One of the photos could not be found. Please upload it again." (existing)
- "This listing no longer exists."
- "This listing is no longer open."
- "You can't offer more than the quantity left."
- "This offer no longer exists."
- "This offer has already been answered."
- "Only owners and managers can do this."
- "You don't have access to this workspace." (existing, used for someone else's listing/offer)

## Website
- **Farmer home, "My listings":** a "New listing" button opens a form (residue chips, quantity, price, region, note, photos); each lot shows its photo, residue, remaining/original kg, price, status, and its offers with Accept / Decline; Withdraw on open lots. Empty state: "No listings yet". The getting-started step "List your first residue" ticks once a lot exists.
- **Farmer and factory, "Sales":** each sale with the other side's name, region and a Call button, quantity, price, total; the factory's line shows "+ 5% fee".
- **Factory home, "Browse residues":** residue filter, lot cards, "Make an offer" (quantity, price prefilled with the asking price, message, live total + fee); **"My offers"** with status and Withdraw.
- **Admin:** a "Marketplace" section: number of sales, value traded, fees owed, latest sales.
- Guest preview shows sample lots. Bilingual (English/Arabic RTL); numbers `dir="ltr"`.

## Out of scope
Quality score on lots (piece 3), billing the fees (piece 4), notifications (email/SMS), chat between parties, delivery tracking, ratings.

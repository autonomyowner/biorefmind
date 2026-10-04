# Marketplace — implementation plan

**Goal:** farmers post residue lots, factories make offers, an accepted offer is a recorded sale with the 5% buyer fee, admins see sales and fees.
**Design + contract:** `docs/superpowers/specs/2026-10-04-marketplace-design.md`. **Branch:** `marketplace`.

## Part 1 — core, test-first
1. `convex/lib/market.ts` (pure): `MARKET_REFUSE` texts, `cleanQuantity`, `cleanPrice`, `cleanNote`, `saleAmounts(quantityKg, priceDzdPerKg)` → `{ totalDzd, feeDzd }`, `offerFits(offer, remainingKg)`. `MARKET_FEE_RATE` in `convex/lib/pricing.ts`. Unit tests `convex/lib/market.test.ts` first.
2. `convex/schema.ts`: `listings`, `offers`, `sales` tables.
3. `convex/market.ts`: every function in the contract. Backend tests `convex/market.test.ts` first: create/refusals per kind and role; browse hides phone and closed lots; offer refusals, replace-on-reoffer, withdraw; accept → sale amounts, remaining down, sold at 0, non-fitting pending offers declined; decline; contact only after sale; withdraw listing declines pending offers; other workspaces refused.
4. `convex/admin.ts`: `sales` query + test.

## Part 2 — website
5. `src/lib/types.ts` (`MyListing`, `MarketListing`, `MyOffer`, `Sale`, `AdminSales`), `src/lib/pricing.ts` (`formatDzd`), `src/i18n/backend-errors.ts` (Arabic for every new refusal).
6. `src/components/dashboard/market-messages.ts` (en/ar), `src/components/dashboard/market.tsx`: `MyListings`, `NewListingForm`, `BrowseListings`, `OfferForm`, `MyOffers`, `SalesPanel`, sample data for guest preview.
7. Wire into `homes.tsx` (farmer, factory) and `shell.tsx` nav; update the step "List your first residue".
8. Admin `MarketSection` in `src/components/admin/admin-page.tsx`.

## Part 3 — integration and verification
9. `npm test`, both type checks, lint, `next build`; push functions to dev Convex.
10. Real Chrome run against dev: farmer signs up and posts a lot with a photo; factory signs up, browses, offers; farmer accepts; both see the sale and phones; Arabic view; 360 px with no sideways scroll; admin sees the sale.
11. CLAUDE.md status + open decisions; memory note.

## Summary
Farmers will be able to put their leftover crops up for sale with a price and photos.
Factories will see them, offer a price, and the farmer says yes or no.
A yes becomes a recorded sale with the platform's 5% fee, and both sides get each other's phone number.

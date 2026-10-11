# Fresh produce, hidden-name lots, interest form, admin ready for use (2026-10-11)

Owner (2026-10-11): "There is a folder called farmers with some products. List them under hidden names. If someone is
interested they can reach out and we receive it on the admin dashboard. Farmers can sell fresh produce, not only
leftovers, and we get commission on both sides. Make the admin dashboard production ready. Don't ask me many questions."
Then: "choose only the best images, three at most per product."

Defaults chosen without the owner (recorded as open decision 21):
- "Commission on both sides" = the buyer **and** the seller each pay 5% (draft rate), on residues **and** fresh produce.
  The buyer's 5% is on top of the price; the seller's 5% comes out of it.
- "Hidden names" = the farmer's name and phone are never shown. Lots that BiorefMind posts for farmers who are not on the
  platform show as "BiorefMind partner farm #N" (one number per farmer phone/name, reused across that farmer's lots).
- Those lots take **interest requests** (name, phone, optional email/company/kg/message, no sign-in) instead of offers;
  BiorefMind calls back. Offers stay the way factories buy regular lots.

## 1. Fresh produce
- `listings.category` and `sales.category`: `"residue" | "fresh"`, optional in storage (missing = residue).
- `convex/lib/catalog.ts`: `FRESH_PRODUCE` = mushrooms, pomegranates, tomatoes, potatoes, onions, peppers, citrus,
  dates, olives, grapes, apples, figs. `RESIDUES` gains `corn_husks`. Both allow `"other"` + typed name (as today).
- The product key stays in the `residue` field (no migration). `cleanProduct(category, key, name)` checks the key against
  the right list; refusal `"Choose a product from the list."` for fresh.
- `market.createListing` takes optional `category`; `market.publicLots` / `market.browse` take optional `category` and return it.
- AI photo check: the prompt says "fresh produce" instead of "residue" for fresh lots.

## 2. Fees on both sides
- `convex/lib/pricing.ts`: `MARKET_FEE_RATE` (buyer, 5%) and new `SELLER_FEE_RATE` (5%).
- `saleAmounts` → `{ totalDzd, feeDzd, sellerFeeDzd }`; `sales.sellerFeeDzd` optional (old rows = 0).
- `market.mySales` returns `sellerFeeDzd` (farm side: "BiorefMind fee 5%: X · you receive Y").
- Copy that says "you keep the full price" / "free for farmers" changes to "listing is free; BiorefMind takes 5% of each sale".

## 3. Hidden-name lots (BiorefMind posts for offline farmers)
- One "house" farm company (`companies.house: true`, index `by_house`) owns them; created on first use, owned by the
  admin who posts; no membership, hidden from the admin's account list.
- `listings.managed`: `{ farmerName, farmerPhone?, privateNote? }` (admin only) and `listings.partnerNo`.
- Public rows: `sellerName: ""`, `partnerNo: N`, `managed: true`. Never the farmer's name or phone.
- `market.makeOffer` refuses a managed lot: `"This lot is sold through BiorefMind: send your interest instead."`

## 4. Interest requests
- Table `inquiries`: listingId, name, phone, email?, company?, quantityKg?, message?, userId?, status
  `new | contacted | closed`, adminNote?, createdAt, updatedAt?.
- `inquiries.send` (no sign-in): only on open managed lots. Limits: 5 per phone per UTC day, 500 platform-wide per day.
  A filled honeypot (`website`) is accepted silently and dropped.

## 5. Admin
- New sections: Interest requests (status, note, call/WhatsApp/mail links), BiorefMind lots (post with up to 3 photos,
  edit price/kg/note/farmer, mark sold, withdraw, reopen), All open lots (moderation: withdraw with a reason, shows the
  real seller and phone), Activity (every admin action).
- Overview tiles: open lots, new interest requests, fees earned (buyers + sellers).
- Marketplace section shows buyer fee, seller fee and both totals; accounts list has CSV export.
- `adminLog` table written by every admin mutation.

## Contract (backend)
Refusals are exact strings in `convex/lib/market.ts` `MARKET_REFUSE` and `convex/lib/inquiries.ts` `INQUIRY_REFUSE`.

| Function | Args | Returns |
|---|---|---|
| `market.createListing` | + `category?: "residue"\|"fresh"` | listingId |
| `market.publicLots`, `market.browse` | `{ residue?, category? }` | rows + `category`, `managed`, `partnerNo?` |
| `market.myListings` | – | rows + `category` |
| `market.mySales` | – | rows + `category`, `sellerFeeDzd` |
| `inquiries.send` | `{ listingId, name, phone, email?, company?, quantityKg?, message?, website? }` | `null` |
| `inquiries.list` (admin) | `{ status? }` | latest 200: inquiry + lot (product, category, partnerNo, farmerName, farmerPhone) |
| `inquiries.setStatus` (admin) | `{ inquiryId, status, adminNote? }` | `null` |
| `adminLots.uploadUrl` (admin) | – | upload URL |
| `adminLots.create` (admin) | `{ category, residue, residueName?, quantityKg, priceDzdPerKg, region, note?, photoIds (≤3), farmerName, farmerPhone?, privateNote? }` | listingId |
| `adminLots.update` (admin) | `{ listingId, priceDzdPerKg?, remainingKg?, region?, note?, farmerName?, farmerPhone?, privateNote? }` | `null` |
| `adminLots.setStatus` (admin) | `{ listingId, status: "open"\|"sold"\|"withdrawn" }` | `null` |
| `adminLots.list` (admin) | – | managed lots with private fields, photo URLs, inquiry counts |
| `admin.openLots` (admin) | – | every open lot with real seller name + phone |
| `admin.withdrawLot` (admin) | `{ listingId, reason }` | `null` |
| `admin.activity` (admin) | – | latest 100 log rows |
| `admin.sales` | – | + `sellerFeeDzd` totals and per row |
| `admin.overview` | – | + `stats: { openLots, newInquiries }`; house company left out |

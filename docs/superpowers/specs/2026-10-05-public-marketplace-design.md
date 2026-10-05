# Public marketplace page — design (2026-10-05)

Owner's ask: "is there a marketplace page where farmers' posts are published?" There was none:
open lots were only visible in the factory dashboard ("Browse"), and only to signed-in users.
Owner approved: a public `/marketplace` page anyone can see, phone numbers still hidden until a sale.

## What visitors see
- `/marketplace`, in English and Arabic (cookie language, like the landing page), same header and
  look as the landing (`SectionBadge` + gradient `Headline`, frosted cards, azure/violet only).
- A short header: badge, title, one line, and three live numbers (open lots, kg available,
  regions).
- Filter chips by residue (All + the catalog's residues) and a sort (newest / lowest price / most kg).
- One card per open lot: first photo (or the quiet placeholder) with "+N", residue, price in DA/kg,
  kg available, region, seller name, date posted, the note (clamped). Clicking a card opens a
  dialog with all photos and the full note.
- Every card's action:
  - guest → "Sign up to make an offer" → `/signup?as=factory` (sign-up opens on the factory form);
  - signed in → "Make an offer" → `/dashboard#browse` (the factory dashboard's Browse; farms and labs
    land on their dashboard).
- Empty state when nothing is open (or nothing for the chosen residue) with a call for farmers to list.
- Never shown: phone, email, company id, offers, sold or withdrawn lots.

## Backend
- New `market.publicLots({ residue? })`: no sign-in needed; the same rows as `market.browse`
  (open lots, newest first, up to 100, `listingId, residue, remainingKg, priceDzdPerKg, region,
  note, photoUrls, sellerName, createdAt`). Both share one helper so they cannot drift.
- An unknown residue returns `[]` (no error).
- `market.browse` keeps requiring sign-in (unchanged).

## Rendering
- Server component fetches the first page with `fetchQuery` (fast first paint, indexable); the
  client keeps it live with `useQuery(...) ?? initial`. Language cookie makes the page dynamic.
- Links in: header nav ("Marketplace"), mobile menu, the landing's account-types section
  (ghost button "See lots for sale"), the farmer's "My listings" panel ("See the public marketplace").
- `robots` already allows it; metadata title/description per language.

## Not in scope
Lot detail URLs, region filter, search, pagination beyond 100, lab results/quality score on lots.

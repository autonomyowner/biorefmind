import { ConvexError } from "convex/values";
import { pickKnown } from "./accounts";
import { RESIDUES } from "./catalog";
import { MARKET_FEE_RATE } from "./pricing";

export const MAX_LISTING_PHOTOS = 4;

/** The residue key of a lot whose farmer typed what it is (in `residueName`). */
export const OTHER_RESIDUE = "other";

/** Every refusal of the marketplace functions, word for word (the website translates them). */
export const MARKET_REFUSE = {
  farmOnly: "Only farm accounts can list residues.",
  factoryOnly: "Only factory accounts can make offers.",
  residue: "Choose a residue from the list.",
  residueName: "Type what you have (2 to 80 characters).",
  quantity: "Quantity must be a whole number of kilograms (1 to 10,000,000).",
  price: "Price must be between 0.01 and 100,000 DA per kg.",
  note: "The note can be up to 1000 characters.",
  photos: "You can attach up to 4 photos.",
  photoMissing: "One of the photos could not be found. Please upload it again.",
  noListing: "This listing no longer exists.",
  closed: "This listing is no longer open.",
  tooMuch: "You can't offer more than the quantity left.",
  noOffer: "This offer no longer exists.",
  answered: "This offer has already been answered.",
  role: "Only owners and managers can do this.",
} as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function cleanQuantity(kg: number): number {
  if (!Number.isInteger(kg) || kg < 1 || kg > 10_000_000) throw new ConvexError(MARKET_REFUSE.quantity);
  return kg;
}

/** DA per kg, kept to 2 decimals. */
export function cleanPrice(dzd: number): number {
  const p = Number.isFinite(dzd) ? round2(dzd) : Number.NaN;
  if (!(p >= 0.01 && p <= 100_000)) throw new ConvexError(MARKET_REFUSE.price);
  return p;
}

/** A catalog residue, or "other" with the farmer's own words for it (2–80 characters). */
export function cleanResidue(key: string, name: string | undefined): { residue: string; residueName?: string } {
  if (key === OTHER_RESIDUE) {
    const s = name?.trim() ?? "";
    if (s.length < 2 || s.length > 80) throw new ConvexError(MARKET_REFUSE.residueName);
    return { residue: OTHER_RESIDUE, residueName: s };
  }
  const [residue] = pickKnown([key], RESIDUES);
  if (!residue) throw new ConvexError(MARKET_REFUSE.residue);
  return { residue };
}

export function cleanNote(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  if (s.length > 1000) throw new ConvexError(MARKET_REFUSE.note);
  return s;
}

/** What a sale is worth, and BiorefMind's fee on it (paid by the buyer on top), to the dinar. */
export function saleAmounts(quantityKg: number, priceDzdPerKg: number): { totalDzd: number; feeDzd: number } {
  const totalDzd = round2(quantityKg * priceDzdPerKg);
  return { totalDzd, feeDzd: Math.round(totalDzd * MARKET_FEE_RATE) };
}

/** A pending offer can still be accepted while it asks for no more than what is left. */
export function offerFits(offer: { quantityKg: number }, remainingKg: number): boolean {
  return offer.quantityKg <= remainingKg;
}

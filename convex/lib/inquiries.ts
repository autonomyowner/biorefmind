import { ConvexError } from "convex/values";

// Interest requests on lots BiorefMind sells for farmers. Design: specs/2026-10-11-fresh-managed-admin-design.md

/** Every refusal of the interest requests and the admin's lots, word for word (the website translates them). */
export const INQUIRY_REFUSE = {
  name: "Please enter your name (2 to 80 characters).",
  phone: "Please enter a phone number we can call.",
  email: "That email address doesn't look right.",
  company: "The company name can be up to 80 characters.",
  quantity: "Quantity must be a whole number of kilograms (1 to 10,000,000).",
  message: "The message can be up to 1000 characters.",
  notManaged: "This lot takes offers: sign up as a factory to make one.",
  tooMany: "You've sent several requests today. BiorefMind will call you back soon.",
  busy: "We're receiving many requests right now. Please try again tomorrow.",
  noInquiry: "This request no longer exists.",
  adminNote: "The note can be up to 1000 characters.",
  farmerName: "Enter the farmer's name (2 to 80 characters).",
  reason: "Please write a short reason (2 to 300 characters).",
  notHouse: "This lot was not posted by BiorefMind.",
  remaining: "Quantity left must be between 0 and the listed quantity.",
  photos: "You can attach up to 3 photos.",
} as const;

/** Per phone number and per UTC day; and for the whole platform per UTC day. */
export const INQUIRIES_PER_PHONE_DAY = 5;
export const INQUIRIES_PER_DAY = 500;
/** Photos on a lot BiorefMind posts (owner: "three at max"). */
export const MAX_HOUSE_PHOTOS = 3;

export type InquiryInput = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  quantityKg?: number;
  message?: string;
};

const opt = (s: string | undefined) => {
  const t = s?.trim();
  return t ? t : undefined;
};

/** The visitor's details, trimmed; optional fields only when filled. */
export function cleanInquiry(raw: InquiryInput): InquiryInput {
  const name = raw.name.trim();
  if (name.length < 2 || name.length > 80) throw new ConvexError(INQUIRY_REFUSE.name);
  const phone = raw.phone.trim();
  if (!/^\d{7,20}$/.test(phone.replace(/[\s+\-().]/g, "")) || phone.length > 30) throw new ConvexError(INQUIRY_REFUSE.phone);
  const out: InquiryInput = { name, phone };
  const email = opt(raw.email)?.toLowerCase();
  if (email) {
    if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError(INQUIRY_REFUSE.email);
    out.email = email;
  }
  const company = opt(raw.company);
  if (company) {
    if (company.length > 80) throw new ConvexError(INQUIRY_REFUSE.company);
    out.company = company;
  }
  if (raw.quantityKg !== undefined) {
    if (!Number.isInteger(raw.quantityKg) || raw.quantityKg < 1 || raw.quantityKg > 10_000_000) {
      throw new ConvexError(INQUIRY_REFUSE.quantity);
    }
    out.quantityKg = raw.quantityKg;
  }
  const message = opt(raw.message);
  if (message) {
    if (message.length > 1000) throw new ConvexError(INQUIRY_REFUSE.message);
    out.message = message;
  }
  return out;
}

/** Digits of a phone number, for matching the same number typed differently (+213 / 00213 → leading 0). */
export function phoneDigits(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const m = /^(?:00)?213(\d{9})$/.exec(d);
  return m ? `0${m[1]}` : d;
}

/** Which offline farmer a lot belongs to: by phone digits when known, else by name. One partner number each. */
export function partnerKey(m: { farmerName: string; farmerPhone?: string }): string {
  const digits = phoneDigits(m.farmerPhone ?? "");
  return digits ? `p:${digits}` : `n:${m.farmerName.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/** A short required text (farmer name, moderation reason). */
export function cleanText(raw: string, min: number, max: number, refusal: string): string {
  const s = raw.trim();
  if (s.length < min || s.length > max) throw new ConvexError(refusal);
  return s;
}

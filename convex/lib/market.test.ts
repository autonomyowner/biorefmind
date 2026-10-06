import { describe, expect, test } from "vitest";
import { cleanNote, cleanPrice, cleanQuantity, cleanResidue, hasPhone, MARKET_REFUSE, maskPhones, offerFits, saleAmounts } from "./market";
import { MARKET_FEE_RATE } from "./pricing";

describe("cleanQuantity", () => {
  test("whole kilograms from 1 to 10,000,000", () => {
    expect(cleanQuantity(1)).toBe(1);
    expect(cleanQuantity(10_000_000)).toBe(10_000_000);
    for (const bad of [0, -5, 1.5, 10_000_001, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => cleanQuantity(bad)).toThrow(MARKET_REFUSE.quantity);
    }
  });
});

describe("cleanPrice", () => {
  test("0.01 to 100,000 DA per kg, kept to 2 decimals", () => {
    expect(cleanPrice(0.01)).toBe(0.01);
    expect(cleanPrice(100_000)).toBe(100_000);
    expect(cleanPrice(12.345)).toBe(12.35);
    for (const bad of [0, 0.004, -1, 100_000.01, Number.NaN]) {
      expect(() => cleanPrice(bad)).toThrow(MARKET_REFUSE.price);
    }
  });
});

describe("cleanNote", () => {
  test("trimmed, empty becomes undefined, over 1000 refused", () => {
    expect(cleanNote(undefined)).toBeUndefined();
    expect(cleanNote("   ")).toBeUndefined();
    expect(cleanNote("  dry, bagged  ")).toBe("dry, bagged");
    expect(cleanNote("x".repeat(1000))).toHaveLength(1000);
    expect(() => cleanNote("x".repeat(1001))).toThrow(MARKET_REFUSE.note);
  });
});

describe("cleanResidue", () => {
  test("a catalog residue drops any typed name", () => {
    expect(cleanResidue("olive_pomace", undefined)).toEqual({ residue: "olive_pomace" });
    expect(cleanResidue("olive_pomace", "anything")).toEqual({ residue: "olive_pomace" });
  });
  test("'other' needs a typed name of 2 to 80 characters, trimmed", () => {
    expect(cleanResidue("other", "  Dried lemon peels  ")).toEqual({ residue: "other", residueName: "Dried lemon peels" });
    expect(cleanResidue("other", "x".repeat(80)).residueName).toHaveLength(80);
    for (const bad of [undefined, "", "   ", "x", "x".repeat(81)]) {
      expect(() => cleanResidue("other", bad)).toThrow(MARKET_REFUSE.residueName);
    }
  });
  test("anything else is refused", () => {
    expect(() => cleanResidue("gold", "Gold")).toThrow(MARKET_REFUSE.residue);
  });
});

describe("saleAmounts", () => {
  test("total is quantity × price; buyer fee is 5% of it, to the dinar", () => {
    expect(MARKET_FEE_RATE).toBe(0.05);
    expect(saleAmounts(2000, 15)).toEqual({ totalDzd: 30_000, feeDzd: 1500 });
    expect(saleAmounts(333, 1.5)).toEqual({ totalDzd: 499.5, feeDzd: 25 });
    expect(saleAmounts(1, 0.01)).toEqual({ totalDzd: 0.01, feeDzd: 0 });
  });
});

describe("offerFits", () => {
  test("a pending offer fits while its quantity is at most what is left", () => {
    expect(offerFits({ quantityKg: 500 }, 500)).toBe(true);
    expect(offerFits({ quantityKg: 501 }, 500)).toBe(false);
    expect(offerFits({ quantityKg: 1 }, 0)).toBe(false);
  });
});

describe("phone numbers in free text", () => {
  const phones = [
    "0555 12 34 56",
    "0661234567",
    "07.70.12.34.56",
    "call 0550-11-22-33 after 5",
    "+213 555 12 34 56",
    "00213555123456",
    "+213-6-61-23-45-67",
    "036 12 34 56", // Sétif landline
    "٠٥٥٥١٢٣٤٥٦", // Arabic-Indic digits
  ];
  const fine = ["2000 kg in 50 kg bags", "collected 2026-10-06", "price 15 DA, 1 500 000 DA total", "lot 12345678", "06/10/2026"];

  test("Algerian mobiles, landlines and +213 numbers are found; amounts, dates and lot numbers are not", () => {
    for (const p of phones) expect(hasPhone(p), p).toBe(true);
    for (const s of fine) expect(hasPhone(s), s).toBe(false);
  });

  test("maskPhones hides only the number", () => {
    expect(maskPhones("Dry peels, call 0555 12 34 56 today")).toBe("Dry peels, call ••• today");
    expect(maskPhones("2000 kg, ready 2026-10-06")).toBe("2000 kg, ready 2026-10-06");
  });

  test("notes and messages with a phone number are refused", () => {
    expect(() => cleanNote("Call me on 0661 23 45 67")).toThrow(MARKET_REFUSE.phone);
    expect(cleanNote("Dry, in 50 kg bags")).toBe("Dry, in 50 kg bags");
  });
});

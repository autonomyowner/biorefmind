import { describe, expect, test } from "vitest";
import { cleanInquiry, INQUIRY_REFUSE, partnerKey } from "./inquiries";

const ok = { name: "  Amine B.  ", phone: " 0555 12 34 56 " };

describe("cleanInquiry", () => {
  test("trims, keeps optional fields only when filled", () => {
    expect(cleanInquiry(ok)).toEqual({ name: "Amine B.", phone: "0555 12 34 56" });
    expect(
      cleanInquiry({ ...ok, email: " A@B.dz ", company: " Conserverie ", quantityKg: 200, message: " Call after 5 pm " }),
    ).toEqual({ name: "Amine B.", phone: "0555 12 34 56", email: "a@b.dz", company: "Conserverie", quantityKg: 200, message: "Call after 5 pm" });
    expect(cleanInquiry({ ...ok, email: " ", company: "", message: "  " })).toEqual({ name: "Amine B.", phone: "0555 12 34 56" });
  });
  test("refuses bad fields with plain words", () => {
    expect(() => cleanInquiry({ ...ok, name: "A" })).toThrow(INQUIRY_REFUSE.name);
    expect(() => cleanInquiry({ ...ok, phone: "12" })).toThrow(INQUIRY_REFUSE.phone);
    expect(() => cleanInquiry({ ...ok, email: "not-an-email" })).toThrow(INQUIRY_REFUSE.email);
    expect(() => cleanInquiry({ ...ok, company: "x".repeat(81) })).toThrow(INQUIRY_REFUSE.company);
    expect(() => cleanInquiry({ ...ok, quantityKg: 0 })).toThrow(INQUIRY_REFUSE.quantity);
    expect(() => cleanInquiry({ ...ok, quantityKg: 1.5 })).toThrow(INQUIRY_REFUSE.quantity);
    expect(() => cleanInquiry({ ...ok, message: "x".repeat(1001) })).toThrow(INQUIRY_REFUSE.message);
  });
});

describe("partnerKey", () => {
  test("the same farmer by phone digits, else by name, ignoring case and spacing", () => {
    expect(partnerKey({ farmerName: "Said", farmerPhone: "+213 555 12-34-56" })).toBe("p:0555123456");
    expect(partnerKey({ farmerName: "Said", farmerPhone: "00213555123456" })).toBe("p:0555123456");
    expect(partnerKey({ farmerName: "Said", farmerPhone: "0555 12 34 56" })).toBe("p:0555123456");
    expect(partnerKey({ farmerName: "  Ferme  SAID ", farmerPhone: undefined })).toBe("n:ferme said");
    expect(partnerKey({ farmerName: "Ferme Said", farmerPhone: "" })).toBe("n:ferme said");
  });
});

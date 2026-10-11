import { describe, expect, it } from "vitest";

import { csvField, telHref, toCsv, waHref } from "./admin-utils";

describe("waHref", () => {
  it("turns an Algerian 0… number into 213…", () => {
    expect(waHref("0550 12 34 56")).toBe("https://wa.me/213550123456");
  });
  it("keeps +213 and 00213 numbers", () => {
    expect(waHref("+213 550-12-34-56")).toBe("https://wa.me/213550123456");
    expect(waHref("00213550123456")).toBe("https://wa.me/213550123456");
  });
  it("leaves other numbers as digits", () => {
    expect(waHref("+33 6 12 34 56 78")).toBe("https://wa.me/33612345678");
  });
});

describe("telHref", () => {
  it("keeps digits and +", () => {
    expect(telHref("+213 (550) 12-34-56")).toBe("tel:+213550123456");
  });
});

describe("csv", () => {
  it("quotes every field and doubles inner quotes", () => {
    expect(csvField('Ferme "El Baraka", Biskra')).toBe('"Ferme ""El Baraka"", Biskra"');
  });
  it("defuses spreadsheet formulas but keeps phone numbers", () => {
    expect(csvField("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvField("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvField("-cmd")).toBe(`"'-cmd"`);
    expect(csvField("+213550123456")).toBe('"+213550123456"');
  });
  it("starts with a BOM and ends lines with CRLF", () => {
    const csv = toCsv(["Name", "Region"], [["مزرعة", "Biskra"]]);
    expect(csv).toBe('﻿"Name","Region"\r\n"مزرعة","Biskra"\r\n');
  });
});

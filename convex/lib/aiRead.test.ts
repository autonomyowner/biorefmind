import { describe, expect, test } from "vitest";
import { cleanUploads, parseReading, READ_REFUSE, readSchema, readingPrompt, sniffType } from "./aiRead";

const DAY = 86_400_000;
const received = Date.UTC(2026, 9, 1, 12);
const now = Date.UTC(2026, 9, 6, 12);
const analyses = ["moisture", "punicalagin", "mold", "heavy_metals"];

const answer = {
  items: [
    { analysis: "moisture", value: 11.2, qualifier: "none", uncertainty: 0.4 },
    { analysis: "punicalagin", value: 0, qualifier: "nd", uncertainty: 0 },
    { analysis: "mold", value: 100, qualifier: "<", uncertainty: 0 },
  ],
  panels: [
    {
      analysis: "heavy_metals",
      lines: [
        { name: "Lead (Pb)", value: 0.12, qualifier: "none", unit: "mg/kg" },
        { name: "Cadmium (Cd)", value: 0.01, qualifier: "<", unit: "mg/kg" },
      ],
    },
  ],
  testedFrom: "2026-10-02",
  testedTo: "2026-10-05",
  notes: [{ en: "Oxidation was on the sheet but not requested.", ar: "الأكسدة موجودة في الورقة لكنها غير مطلوبة." }],
};

describe("parseReading", () => {
  test("a good answer becomes form-ready values", () => {
    const r = parseReading(JSON.stringify(answer), analyses, received, now);
    expect(r).toEqual({
      items: [
        { analysis: "moisture", value: 11.2, uncertainty: 0.4 },
        { analysis: "punicalagin", value: 0, qualifier: "nd" },
        { analysis: "mold", value: 100, qualifier: "<" },
      ],
      panels: [
        {
          analysis: "heavy_metals",
          lines: [
            { name: "Lead (Pb)", value: 0.12, unit: "mg/kg" },
            { name: "Cadmium (Cd)", value: 0.01, qualifier: "<", unit: "mg/kg" },
          ],
        },
      ],
      testedFrom: "2026-10-02",
      testedTo: "2026-10-05",
      notes: answer.notes,
    });
  });

  test("analyses not requested, impossible values and analyses read twice are dropped", () => {
    const r = parseReading(
      JSON.stringify({
        ...answer,
        items: [
          { analysis: "pectin", value: 20, qualifier: "none", uncertainty: 0 }, // not requested
          { analysis: "heavy_metals", value: 1, qualifier: "none", uncertainty: 0 }, // a panel, not an item
          { analysis: "moisture", value: 140, qualifier: "none", uncertainty: 0 }, // over 100 %
          { analysis: "mold", value: -3, qualifier: "none", uncertainty: 0 },
          { analysis: "punicalagin", value: 80, qualifier: "none", uncertainty: 0 },
          { analysis: "punicalagin", value: 90, qualifier: "none", uncertainty: 0 }, // a second, different reading: trust neither
          { analysis: "moisture", value: 12, qualifier: "none", uncertainty: 0 }, // already refused above, so this one counts as a repeat too
        ],
        panels: [{ analysis: "pesticides", lines: [{ name: "x", value: 1, qualifier: "none", unit: "mg/kg" }] }],
      }),
      analyses,
      received,
      now,
    );
    expect(r?.items).toEqual([]);
    expect(r?.panels).toEqual([]);
  });

  test("panel lines need a name and a unit; text is cleaned", () => {
    const r = parseReading(
      JSON.stringify({
        ...answer,
        panels: [
          {
            analysis: "heavy_metals",
            lines: [
              { name: "", value: 1, qualifier: "none", unit: "mg/kg" },
              { name: "Lead call 0555 12 34 56", value: 1, qualifier: "none", unit: "" },
              { name: "Arsenic (As)", value: 0.2, qualifier: "none", unit: "mg/kg dry matter, as received basis!!" },
            ],
          },
        ],
      }),
      analyses,
      received,
      now,
    );
    expect(r?.panels[0].lines).toEqual([{ name: "Arsenic (As)", value: 0.2, unit: "mg/kg dry matter, as received" }]);
  });

  test("test dates outside receipt..today are dropped; bad JSON is null", () => {
    const r = parseReading(JSON.stringify({ ...answer, testedFrom: "2026-09-01", testedTo: "2026-12-01" }), analyses, received, now);
    expect(r?.testedFrom).toBeUndefined();
    expect(r?.testedTo).toBeUndefined();
    expect(parseReading("nope", analyses, received, now)).toBeNull();
    expect(parseReading(JSON.stringify({ items: "x" }), analyses, received, now)).toBeNull();
    expect(received + 5 * DAY).toBe(now);
  });
});

describe("readSchema and readingPrompt", () => {
  test("the schema only allows the analyses requested", () => {
    const s = readSchema(analyses);
    const items = s.json_schema.schema.properties.items.items.properties.analysis.enum;
    const panels = s.json_schema.schema.properties.panels.items.properties.analysis.enum;
    expect(items).toEqual(["moisture", "punicalagin", "mold"]);
    expect(panels).toEqual(["heavy_metals"]);
    // Nothing of one kind requested still gives a valid schema.
    expect(readSchema(["moisture"]).json_schema.schema.properties.panels.items.properties.analysis.enum).toEqual(["none"]);
  });

  test("the prompt names each analysis with its unit", () => {
    const p = readingPrompt(analyses);
    expect(p).toContain("moisture: % (wet basis)");
    expect(p).toContain("mold: CFU/g");
    expect(p).toContain("heavy_metals: a list of named parameters");
  });
});

describe("sniffType", () => {
  test("PDF, JPEG, PNG and WebP by their first bytes; anything else is null", () => {
    const b = (...x: number[]) => new Uint8Array([...x, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sniffType(b(0x25, 0x50, 0x44, 0x46))).toBe("application/pdf");
    expect(sniffType(b(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffType(b(0x89, 0x50, 0x4e, 0x47))).toBe("image/png");
    expect(sniffType(b(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(sniffType(b(0x3c, 0x68, 0x74, 0x6d))).toBeNull(); // "<htm"
  });
});

describe("cleanUploads", () => {
  const img = (size = 100_000) => ({ contentType: "image/jpeg", size });
  test("1 to 4 photos, or one PDF up to 8 MB", () => {
    expect(() => cleanUploads([img()])).not.toThrow();
    expect(() => cleanUploads([img(), img(), img(), img()])).not.toThrow();
    expect(() => cleanUploads([{ contentType: "application/pdf", size: 7_000_000 }])).not.toThrow();
    expect(() => cleanUploads([])).toThrow(READ_REFUSE.files);
    expect(() => cleanUploads([img(), img(), img(), img(), img()])).toThrow(READ_REFUSE.files);
    expect(() => cleanUploads([img(), { contentType: "application/pdf", size: 10 }])).toThrow(READ_REFUSE.files);
    expect(() => cleanUploads([{ contentType: "application/pdf", size: 9_000_000 }])).toThrow(READ_REFUSE.fileType);
    expect(() => cleanUploads([{ contentType: "text/html", size: 10 }])).toThrow(READ_REFUSE.fileType);
    expect(() => cleanUploads([img(6_000_000)])).toThrow(READ_REFUSE.fileType);
  });
});

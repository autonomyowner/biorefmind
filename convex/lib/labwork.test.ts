import { describe, expect, test } from "vitest";
import {
  ANALYSIS_SPECS,
  BADGE_DAYS,
  badgeVisible,
  cleanDueAt,
  cleanPrices,
  cleanReason,
  cleanResults,
  cleanSample,
  dueDate,
  effectiveStatus,
  isOverdue,
  LAB_REFUSE,
  lotScore,
  normalizeServices,
  sampleNo,
  verifyCode,
  type Results,
} from "./labwork";
import { ANALYSES, PANEL_ANALYSES } from "./catalog";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 6, 10);
const RECEIVED = NOW - 5 * DAY;

describe("catalog", () => {
  test("pectin added, contamination split into three panels, every analysis has a unit and method", () => {
    expect(ANALYSES).toContain("pectin");
    expect(ANALYSES).not.toContain("contamination");
    expect(PANEL_ANALYSES).toEqual(["heavy_metals", "mycotoxins", "pesticides"]);
    for (const a of ANALYSES) expect(ANALYSIS_SPECS[a].method.length).toBeGreaterThan(1);
    expect(ANALYSIS_SPECS.mold.unit).toBe("CFU/g");
    expect(ANALYSIS_SPECS.punicalagin.unit).toBe("mg/g DM");
  });
  test("old 'contamination' services become heavy metals", () => {
    expect(normalizeServices(["moisture", "contamination"])).toEqual(["moisture", "heavy_metals"]);
    expect(normalizeServices(["heavy_metals", "contamination"])).toEqual(["heavy_metals"]);
    expect(normalizeServices(undefined)).toEqual([]);
  });
});

describe("cleanPrices", () => {
  const services = ["moisture", "polyphenols", "pectin"];
  test("whole dinars and 1–90 days, catalog order", () => {
    expect(
      cleanPrices(
        [
          { analysis: "pectin", priceDzd: 4000, days: 5 },
          { analysis: "moisture", priceDzd: 1500, days: 1 },
        ],
        services,
      ),
    ).toEqual([
      { analysis: "moisture", priceDzd: 1500, days: 1 },
      { analysis: "pectin", priceDzd: 4000, days: 5 },
    ]);
  });
  test("refusals", () => {
    expect(() => cleanPrices([{ analysis: "mold", priceDzd: 100, days: 1 }], services)).toThrow(LAB_REFUSE.priceService);
    for (const p of [0, 1.5, 1_000_001, Number.NaN]) {
      expect(() => cleanPrices([{ analysis: "moisture", priceDzd: p, days: 1 }], services)).toThrow(LAB_REFUSE.price);
    }
    for (const d of [0, 91, 2.5]) {
      expect(() => cleanPrices([{ analysis: "moisture", priceDzd: 10, days: d }], services)).toThrow(LAB_REFUSE.days);
    }
  });
  test("a repeated analysis keeps the last entry", () => {
    expect(
      cleanPrices(
        [
          { analysis: "moisture", priceDzd: 1, days: 1 },
          { analysis: "moisture", priceDzd: 2, days: 2 },
        ],
        services,
      ),
    ).toEqual([{ analysis: "moisture", priceDzd: 2, days: 2 }]);
  });
});

describe("cleanSample", () => {
  const good = {
    residue: "pomegranate_peels",
    label: "  Lot A — sun dried ",
    state: "dried",
    collectedAt: NOW - 2 * DAY,
    region: "Sétif",
    grams: 500,
    packaging: " paper bag ",
    notes: "",
  };
  test("trims and drops empty optional text", () => {
    expect(cleanSample(good, NOW)).toEqual({
      residue: "pomegranate_peels",
      label: "Lot A — sun dried",
      state: "dried",
      collectedAt: NOW - 2 * DAY,
      region: "Sétif",
      grams: 500,
      packaging: "paper bag",
    });
  });
  test("other residue keeps the typed name", () => {
    expect(cleanSample({ ...good, residue: "other", residueName: "Fig skins" }, NOW).residueName).toBe("Fig skins");
  });
  test("refusals", () => {
    expect(() => cleanSample({ ...good, label: "x" }, NOW)).toThrow(LAB_REFUSE.label);
    expect(() => cleanSample({ ...good, state: "wet" }, NOW)).toThrow(LAB_REFUSE.state);
    expect(() => cleanSample({ ...good, collectedAt: NOW + 2 * DAY }, NOW)).toThrow(LAB_REFUSE.collectedFuture);
    expect(() => cleanSample({ ...good, collectedAt: NOW - 800 * DAY }, NOW)).toThrow(LAB_REFUSE.collected);
    expect(() => cleanSample({ ...good, collectedAt: Number.NaN }, NOW)).toThrow(LAB_REFUSE.collected);
    expect(() => cleanSample({ ...good, grams: 0 }, NOW)).toThrow(LAB_REFUSE.grams);
    expect(() => cleanSample({ ...good, grams: 100_001 }, NOW)).toThrow(LAB_REFUSE.grams);
    expect(() => cleanSample({ ...good, packaging: "x".repeat(81) }, NOW)).toThrow(LAB_REFUSE.packaging);
    expect(() => cleanSample({ ...good, notes: "x".repeat(1001) }, NOW)).toThrow(LAB_REFUSE.notes);
  });
});

describe("cleanReason", () => {
  test("1–500 characters", () => {
    expect(cleanReason("  backlog ")).toBe("backlog");
    expect(() => cleanReason("  ")).toThrow(LAB_REFUSE.reason);
    expect(() => cleanReason(undefined)).toThrow(LAB_REFUSE.reason);
    expect(() => cleanReason("x".repeat(501))).toThrow(LAB_REFUSE.reason);
  });
});

describe("cleanDueAt", () => {
  test("defaults to the formula; an override must be after receipt and within 180 days", () => {
    expect(cleanDueAt(undefined, RECEIVED, 5)).toBe(RECEIVED + 7 * DAY);
    expect(cleanDueAt(RECEIVED + 10 * DAY, RECEIVED, 5)).toBe(RECEIVED + 10 * DAY);
    expect(() => cleanDueAt(RECEIVED - DAY, RECEIVED, 5)).toThrow(LAB_REFUSE.dueAt);
    expect(() => cleanDueAt(RECEIVED + 181 * DAY, RECEIVED, 5)).toThrow(LAB_REFUSE.dueAt);
  });
});

describe("cleanResults", () => {
  const base: Results = {
    items: [
      { analysis: "moisture", value: 9.5, method: "Oven drying at 105 °C" },
      { analysis: "punicalagin", value: 120, uncertainty: 8, method: "HPLC-DAD" },
    ],
    panels: [],
    testedFrom: NOW - 2 * DAY,
    testedTo: NOW - DAY,
  };
  const metals = {
    analysis: "heavy_metals",
    method: "ICP-OES",
    lines: [{ name: "Lead (Pb)", value: 0.1, unit: "mg/kg", limit: 0.2, limitRef: "Reg. (EU) 2023/915", pass: true }],
  };
  test("keeps requested analyses in request order and drops others", () => {
    const out = cleanResults(
      { ...base, items: [...base.items, { analysis: "pectin", value: 3, method: "Acid" }], panels: [metals] },
      ["punicalagin", "moisture"],
      RECEIVED,
      NOW,
    );
    expect(out.items.map((i) => i.analysis)).toEqual(["punicalagin", "moisture"]);
    expect(out.panels).toEqual([]);
  });
  test("every requested analysis needs a result unless it is a draft", () => {
    expect(() => cleanResults(base, ["moisture", "punicalagin", "pectin"], RECEIVED, NOW)).toThrow(LAB_REFUSE.results);
    expect(() => cleanResults(base, ["moisture", "heavy_metals"], RECEIVED, NOW)).toThrow(LAB_REFUSE.results);
    expect(cleanResults(base, ["moisture", "punicalagin", "pectin"], RECEIVED, NOW, { draft: true }).items).toHaveLength(2);
  });
  test("values within each analysis range; uncertainty 0 or more", () => {
    const one = (value: number, extra: object = {}) =>
      cleanResults({ ...base, items: [{ analysis: "moisture", value, method: "Oven", ...extra }] }, ["moisture"], RECEIVED, NOW);
    expect(() => one(140)).toThrow(LAB_REFUSE.value);
    expect(() => one(Number.NaN)).toThrow(LAB_REFUSE.value);
    expect(() => one(5, { uncertainty: -1 })).toThrow(LAB_REFUSE.value);
    expect(one(5, { uncertainty: 0 }).items[0].uncertainty).toBe(0);
    expect(() =>
      cleanResults({ ...base, items: [{ analysis: "mold", value: 2e9, method: "ISO" }] }, ["mold"], RECEIVED, NOW),
    ).toThrow(LAB_REFUSE.value);
  });
  test("qualifiers: <, > and not detected", () => {
    const out = cleanResults(
      { ...base, items: [{ analysis: "mold", value: 10, qualifier: "<", method: "ISO 21527-2" }] },
      ["mold"],
      RECEIVED,
      NOW,
    );
    expect(out.items[0].qualifier).toBe("<");
    expect(() =>
      cleanResults(
        { ...base, items: [{ analysis: "mold", value: 10, qualifier: "~" as never, method: "ISO" }] },
        ["mold"],
        RECEIVED,
        NOW,
      ),
    ).toThrow(LAB_REFUSE.value);
  });
  test("method 2–120 characters", () => {
    expect(() =>
      cleanResults({ ...base, items: [{ analysis: "moisture", value: 5, method: "x" }] }, ["moisture"], RECEIVED, NOW),
    ).toThrow(LAB_REFUSE.method);
  });
  test("panels need lines with a name and unit", () => {
    const p = { ...base, items: [], panels: [metals] };
    expect(cleanResults(p, ["heavy_metals"], RECEIVED, NOW).panels[0].lines).toHaveLength(1);
    expect(() => cleanResults({ ...p, panels: [{ ...metals, lines: [] }] }, ["heavy_metals"], RECEIVED, NOW)).toThrow(
      LAB_REFUSE.results,
    );
    expect(() =>
      cleanResults({ ...p, panels: [{ ...metals, lines: [{ name: "", value: 1, unit: "mg/kg" }] }] }, ["heavy_metals"], RECEIVED, NOW),
    ).toThrow(LAB_REFUSE.parameter);
    expect(() =>
      cleanResults({ ...p, panels: [{ ...metals, lines: [{ name: "Pb", value: 1, unit: "" }] }] }, ["heavy_metals"], RECEIVED, NOW),
    ).toThrow(LAB_REFUSE.parameter);
  });
  test("pass/fail only against a stated limit and its reference", () => {
    const p = (line: object) =>
      cleanResults({ ...base, items: [], panels: [{ ...metals, lines: [line as never] }] }, ["heavy_metals"], RECEIVED, NOW)
        .panels[0].lines[0];
    expect(p({ name: "Pb", value: 1, unit: "mg/kg", pass: false }).pass).toBeUndefined();
    expect(p({ name: "Pb", value: 1, unit: "mg/kg", limit: 0.2, pass: false }).pass).toBeUndefined();
    expect(p({ name: "Pb", value: 1, unit: "mg/kg", limit: 0.2, limitRef: "EU 2023/915", pass: false }).pass).toBe(false);
  });
  test("test dates between receipt and today, in order", () => {
    const d = (testedFrom: number, testedTo: number) =>
      cleanResults({ ...base, testedFrom, testedTo }, ["moisture", "punicalagin"], RECEIVED, NOW);
    expect(() => d(NOW, NOW - DAY)).toThrow(LAB_REFUSE.testedOrder);
    expect(() => d(RECEIVED - 2 * DAY, NOW)).toThrow(LAB_REFUSE.testedOrder);
    expect(() => d(RECEIVED, NOW + 2 * DAY)).toThrow(LAB_REFUSE.testedOrder);
    expect(d(RECEIVED, NOW).testedTo).toBe(NOW);
  });
  test("deviations up to 1000", () => {
    expect(cleanResults({ ...base, deviations: "  " }, ["moisture"], RECEIVED, NOW).deviations).toBeUndefined();
    expect(() => cleanResults({ ...base, deviations: "x".repeat(1001) }, ["moisture"], RECEIVED, NOW)).toThrow(
      LAB_REFUSE.deviations,
    );
  });
});

describe("effectiveStatus", () => {
  test("requested expires after 7 days and shows lab unavailable when the lab closed", () => {
    expect(effectiveStatus({ status: "requested", createdAt: NOW - 6 * DAY }, NOW, true)).toBe("requested");
    expect(effectiveStatus({ status: "requested", createdAt: NOW - 8 * DAY }, NOW, true)).toBe("expired");
    expect(effectiveStatus({ status: "requested", createdAt: NOW - DAY }, NOW, false)).toBe("lab_unavailable");
  });
  test("accepted expires 30 days after acceptance; later states never expire", () => {
    expect(effectiveStatus({ status: "accepted", createdAt: 0, respondedAt: NOW - 29 * DAY }, NOW, true)).toBe("accepted");
    expect(effectiveStatus({ status: "accepted", createdAt: 0, respondedAt: NOW - 31 * DAY }, NOW, false)).toBe("expired");
    expect(effectiveStatus({ status: "received", createdAt: 0 }, NOW, false)).toBe("received");
    expect(effectiveStatus({ status: "released", createdAt: 0 }, NOW, false)).toBe("released");
  });
});

describe("dates and codes", () => {
  test("due date counts working days as 7/5 calendar days, rounded up", () => {
    expect(dueDate(NOW, 5)).toBe(NOW + 7 * DAY);
    expect(dueDate(NOW, 1)).toBe(NOW + 2 * DAY);
    expect(dueDate(NOW, 3)).toBe(NOW + 5 * DAY);
  });
  test("overdue only while in the lab and past the due date", () => {
    expect(isOverdue({ status: "received", dueAt: NOW - 1 }, NOW)).toBe(true);
    expect(isOverdue({ status: "received", dueAt: NOW + 1 }, NOW)).toBe(false);
    expect(isOverdue({ status: "released", dueAt: NOW - 1 }, NOW)).toBe(false);
  });
  test("sample numbers", () => {
    expect(sampleNo(2026, 42)).toBe("S-2026-0042");
    expect(sampleNo(2026, 12345)).toBe("S-2026-12345");
  });
  test("verify codes are 12 unambiguous characters", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const c = verifyCode();
      expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
      seen.add(c);
    }
    expect(seen.size).toBe(200);
  });
});

describe("lotScore", () => {
  const r = (items: Results["items"], panels: Results["panels"] = []): Results => ({
    items,
    panels,
    testedFrom: NOW,
    testedTo: NOW,
  });
  const goodPeel = [
    { analysis: "punicalagin", value: 150, method: "HPLC" },
    { analysis: "moisture", value: 8, method: "Oven" },
    { analysis: "mold", value: 300, method: "ISO 21527-2" },
  ];
  test("only pomegranate peels are scored", () => {
    expect(lotScore("citrus_peels", "dried", r(goodPeel))).toBeNull();
    expect(lotScore("other", "dried", r(goodPeel))).toBeNull();
  });
  test("no usable values gives no score", () => {
    expect(lotScore("pomegranate_peels", "fresh", r([{ analysis: "moisture", value: 70, method: "Oven" }]))).toBeNull();
    expect(lotScore("pomegranate_peels", "dried", r([{ analysis: "pectin", value: 20, method: "Acid" }]))).toBeNull();
  });
  test("punicalagin mg/g becomes percent; good dried peel reaches A", () => {
    const s = lotScore("pomegranate_peels", "dried", r(goodPeel))!;
    expect(s.route).toBe("A");
    expect(s.score).toBeGreaterThanOrEqual(75);
  });
  test("fresh and frozen peel ignore moisture", () => {
    const wet = goodPeel.map((i) => (i.analysis === "moisture" ? { ...i, value: 70 } : i));
    expect(lotScore("pomegranate_peels", "fresh", r(wet))!.route).toBe("A");
    expect(lotScore("pomegranate_peels", "frozen", r(wet))!.route).toBe("A");
    expect(lotScore("pomegranate_peels", "dried", r(wet))!.route).toBe("C");
  });
  test("moulds in CFU/g: exactly 5 log passes the gate, above 5 log goes to C; '<' counts as the value, 'nd' as 0", () => {
    const mold = (value: number, qualifier?: "<" | "nd") =>
      lotScore("pomegranate_peels", "dried", r([
        { analysis: "punicalagin", value: 150, method: "HPLC" },
        { analysis: "mold", value, qualifier, method: "ISO" },
      ]))!;
    expect(mold(100_000).route).not.toBe("C");
    expect(mold(300_000).route).toBe("C");
    expect(mold(10, "<").route).toBe("A");
    expect(mold(999_999, "nd").route).toBe("A");
  });
  test("a failed contamination line sends the lot to C with a reason", () => {
    const s = lotScore(
      "pomegranate_peels",
      "dried",
      r(goodPeel, [
        {
          analysis: "heavy_metals",
          method: "ICP",
          lines: [{ name: "Lead (Pb)", value: 0.5, unit: "mg/kg", limit: 0.2, limitRef: "EU 2023/915", pass: false }],
        },
      ]),
    )!;
    expect(s.route).toBe("C");
    expect(s.reasons.join(" ")).toContain("Lead (Pb)");
  });
});

describe("badgeVisible", () => {
  test("open lot with results released within 90 days", () => {
    expect(badgeVisible({ status: "open" }, { releasedAt: NOW - 10 * DAY }, NOW)).toBe(true);
    expect(badgeVisible({ status: "sold" }, { releasedAt: NOW - 10 * DAY }, NOW)).toBe(false);
    expect(badgeVisible({ status: "open" }, { releasedAt: NOW - (BADGE_DAYS + 1) * DAY }, NOW)).toBe(false);
    expect(badgeVisible({ status: "open" }, null, NOW)).toBe(false);
  });
});

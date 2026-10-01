import { describe, expect, test } from "vitest";
import { scoreShipment } from "./scoring";

const good = { moisture: 12, mold: 0.5, oxidation: 20, punicalagin: 12.4 };

describe("scoreShipment — pomegranate peel", () => {
  test("a clean, rich shipment goes to A", () => {
    const r = scoreShipment("pomegranate_peel", good);
    // 0.4*80 + 0.2*80 + 0.25*90 + 0.15*80
    expect(r.score).toBe(82.5);
    expect(r.route).toBe("A");
    // all 4 fields, 7.5 points from the 75 boundary → 0.6 + 0.4*0.75
    expect(r.confidence).toBe(0.9);
    expect(r.reasons).toContain("Punicalagin 12.4 % meets the pharmaceutical threshold (≥ 10 %).");
  });

  test("perfect values score 100 with full confidence", () => {
    const r = scoreShipment("pomegranate_peel", { moisture: 8, mold: 0, oxidation: 5, punicalagin: 16 });
    expect(r).toMatchObject({ score: 100, route: "A", confidence: 1 });
  });

  test("low punicalagin keeps a good shipment on B and says why", () => {
    const r = scoreShipment("pomegranate_peel", { ...good, punicalagin: 8, mold: 2 });
    expect(r.score).toBe(61.5);
    expect(r.route).toBe("B");
    expect(r.confidence).toBe(1);
    expect(r.reasons).toContain("Punicalagin 8 % is below the pharmaceutical threshold (≥ 10 %).");
    expect(r.reasons).toContain("Mold 2 % is above the pharmaceutical limit (≤ 1 %).");
  });

  test("a high score is not enough for A when mold is above 1 %", () => {
    const r = scoreShipment("pomegranate_peel", { moisture: 8, mold: 1.5, oxidation: 5, punicalagin: 16 });
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.route).toBe("B");
  });

  test("a poor shipment goes to C", () => {
    const r = scoreShipment("pomegranate_peel", { moisture: 19, mold: 4, oxidation: 55, punicalagin: 2 });
    expect(r.score).toBe(8.5);
    expect(r.route).toBe("C");
  });

  test("hard gate: mold above 5 % is C whatever the rest", () => {
    const r = scoreShipment("pomegranate_peel", { ...good, mold: 7 });
    expect(r.route).toBe("C");
    expect(r.reasons[0]).toBe("Mold 7 % is above the 5 % safety limit — routed to C.");
  });

  test("hard gate: moisture above 20 % is C", () => {
    const r = scoreShipment("pomegranate_peel", { ...good, moisture: 24 });
    expect(r.route).toBe("C");
    expect(r.reasons[0]).toBe("Moisture 24 % is above the 20 % safety limit — routed to C.");
  });

  test("gate values exactly at the limit do not trigger", () => {
    expect(scoreShipment("pomegranate_peel", { ...good, mold: 5 }).reasons[0]).not.toMatch(/safety limit/);
  });

  test("missing values are skipped and the weights re-normalised", () => {
    const r = scoreShipment("pomegranate_peel", { punicalagin: 15, mold: 0 });
    expect(r.score).toBe(100);
    expect(r.route).toBe("A");
    expect(r.confidence).toBe(0.5);
    expect(r.reasons.some((x) => x.includes("Not tested: moisture, oxidation"))).toBe(true);
  });

  test("A needs punicalagin: without it a perfect score stays on B", () => {
    const r = scoreShipment("pomegranate_peel", { moisture: 10 });
    expect(r.score).toBe(100);
    expect(r.route).toBe("B");
    expect(r.confidence).toBe(0.25);
  });

  test("no lab values → score 0, C, confidence 0.2", () => {
    expect(scoreShipment("pomegranate_peel", {})).toEqual({
      score: 0,
      confidence: 0.2,
      route: "C",
      reasons: ["No lab values entered — routed to C until tested."],
    });
  });

  test("confidence stays within bounds and shrinks near a boundary", () => {
    // score exactly on 75 → margin factor 0.6
    for (const p of [2, 5, 8, 10, 12, 15, 20]) {
      for (const m of [0, 1, 3, 6]) {
        const r = scoreShipment("pomegranate_peel", { punicalagin: p, mold: m, moisture: 15 });
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      }
    }
    const near = scoreShipment("pomegranate_peel", { moisture: 15 }); // score 50, on the B boundary
    expect(near.score).toBe(50);
    expect(near.confidence).toBe(0.15); // 0.25 * 0.6
  });

  test("every result explains the route in its last line", () => {
    expect(scoreShipment("pomegranate_peel", good).reasons.at(-1)).toBe(
      "Quality score 82.5 → route A (pharmaceutical extraction).",
    );
  });

  test("unknown crop throws", () => {
    expect(() => scoreShipment("banana", good)).toThrow("Unknown crop.");
  });
});

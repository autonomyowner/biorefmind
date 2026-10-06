import { describe, expect, test } from "vitest";
import { DAY, defaultDue, fromDateInput, makeForm, monthStats, newLine, tabOf, toDateInput, toResults } from "./lab-logic";

const NOW = new Date(2026, 9, 15, 10).getTime(); // 15 Oct 2026, local time
const LAST_MONTH = new Date(2026, 8, 20).getTime();

describe("tabOf", () => {
  test("each status lands in its queue tab", () => {
    expect(tabOf("requested")).toBe("new");
    expect(tabOf("accepted")).toBe("waiting");
    expect(tabOf("received")).toBe("inLab");
    for (const s of ["released", "declined", "cancelled", "expired", "lab_unavailable"]) expect(tabOf(s)).toBe("done");
  });
});

describe("monthStats", () => {
  test("counts this month's requests, first releases, on-time share and money", () => {
    const rows = [
      { status: "requested", createdAt: NOW - DAY, totalDzd: 4000, paid: false, reports: [] },
      { status: "declined", createdAt: NOW - DAY, totalDzd: 9000, paid: false, reports: [] },
      { status: "received", createdAt: NOW - 2 * DAY, totalDzd: 6000, paid: true, reports: [] },
      // released on time this month, amended later (the amendment is not counted again)
      {
        status: "released",
        createdAt: LAST_MONTH,
        totalDzd: 12000,
        paid: true,
        dueAt: NOW,
        reports: [
          { version: 2, releasedAt: NOW },
          { version: 1, releasedAt: NOW - 3 * DAY },
        ],
      },
      // released late this month
      { status: "released", createdAt: LAST_MONTH, totalDzd: 3000, paid: false, dueAt: NOW - 5 * DAY, reports: [{ version: 1, releasedAt: NOW - DAY }] },
      // released last month
      { status: "released", createdAt: LAST_MONTH, totalDzd: 3000, paid: true, dueAt: NOW, reports: [{ version: 1, releasedAt: LAST_MONTH }] },
    ];
    expect(monthStats(rows, NOW)).toEqual({ received: 3, released: 2, onTimePct: 50, requestedDzd: 10000, paidDzd: 6000 });
  });

  test("no releases → no on-time share", () => {
    expect(monthStats([], NOW).onTimePct).toBeNull();
  });
});

describe("dates", () => {
  test("due date: longest turnaround in working days ×7/5, rounded up", () => {
    expect(defaultDue(0, [{ days: 5 }, { days: 3 }])).toBe(7 * DAY);
    expect(defaultDue(0, [{ days: 1 }])).toBe(2 * DAY);
  });
  test("date fields round-trip and read as noon UTC", () => {
    expect(toDateInput(new Date(2026, 0, 5, 23).getTime())).toBe("2026-01-05");
    expect(fromDateInput("2026-01-05")).toBe(Date.UTC(2026, 0, 5, 12));
    expect(fromDateInput("")).toBeNaN();
  });
});

describe("results form", () => {
  const analyses = ["moisture", "mold", "heavy_metals"];
  const methods = { moisture: "Oven", mold: "ISO 21527-2", heavy_metals: "ICP-OES" };

  test("an empty form has the default methods and test dates", () => {
    const f = makeForm({ analyses, methods, receivedAt: NOW - 2 * DAY, now: NOW });
    expect(f.items.moisture.method).toBe("Oven");
    expect(f.panels.heavy_metals.method).toBe("ICP-OES");
    expect(f.panels.heavy_metals.lines).toHaveLength(1);
    expect(f.testedFrom).toBe(toDateInput(NOW - 2 * DAY));
    expect(f.testedTo).toBe(toDateInput(NOW));
  });

  test("skips empty analyses and lines; nd counts as 0; pass needs a limit and its reference", () => {
    const f = makeForm({ analyses, methods, receivedAt: NOW, now: NOW });
    f.items.moisture = { value: "9,5", qualifier: "", uncertainty: "0.3", method: "Oven" };
    f.panels.heavy_metals.lines = [
      newLine({ name: "Lead", value: "", qualifier: "nd", unit: "mg/kg", limit: "0.5", limitRef: "EU 2023/915", pass: "pass" }),
      newLine({ name: "Cadmium", value: "0.02", unit: "mg/kg", limit: "0.1", pass: "pass" }),
      newLine(),
    ];
    f.deviations = "  ";
    const r = toResults(f, analyses);
    expect(r.items).toEqual([{ analysis: "moisture", value: 9.5, uncertainty: 0.3, method: "Oven" }]);
    expect(r.panels).toEqual([
      {
        analysis: "heavy_metals",
        method: "ICP-OES",
        lines: [
          { name: "Lead", value: 0, qualifier: "nd", unit: "mg/kg", limit: 0.5, limitRef: "EU 2023/915", pass: true },
          { name: "Cadmium", value: 0.02, unit: "mg/kg", limit: 0.1 },
        ],
      },
    ]);
    expect(r.deviations).toBeUndefined();
  });

  test("prefills from earlier results", () => {
    const from = {
      items: [{ analysis: "mold", value: 2000, qualifier: "<" as const, method: "DG18" }],
      panels: [],
      testedFrom: Date.UTC(2026, 9, 10, 12),
      testedTo: Date.UTC(2026, 9, 12, 12),
      deviations: "Late arrival",
    };
    const f = makeForm({ analyses, methods, receivedAt: NOW, now: NOW, from });
    expect(f.items.mold).toEqual({ value: "2000", qualifier: "<", uncertainty: "", method: "DG18" });
    expect(f.items.moisture.value).toBe("");
    expect(f.testedFrom).toBe("2026-10-10");
    expect(f.deviations).toBe("Late arrival");
    expect(toResults(f, analyses).items).toEqual([{ analysis: "mold", value: 2000, qualifier: "<", method: "DG18" }]);
  });
});

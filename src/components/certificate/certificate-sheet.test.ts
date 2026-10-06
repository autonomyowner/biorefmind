import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Certificate } from "@/lib/types";
import { certificateMessages } from "./certificate-messages";
import { CertificateSheet } from "./certificate-sheet";
import { catalogLabels } from "../../lib/catalog-labels";

// Vitest has no "@/" alias (vitest.config.ts is for the backend); point the sheet's imports at the files.
vi.mock("@/i18n/messages", () => import("../../i18n/messages"));
vi.mock("@/lib/utils", () => import("../../lib/utils"));
vi.mock("@/lib/catalog-labels", () => import("../../lib/catalog-labels"));
vi.mock("@/components/certificate/format", () => import("./format"));
vi.mock("@/components/certificate/certificate-messages", () => import("./certificate-messages"));

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1, 9);

/** A certificate as labwork.certificate returns it. */
const SAMPLE_CERTIFICATE: Certificate = {
  code: "K7M2QX9TPA4R",
  reportNo: "S-2026-0007-R1",
  version: 1,
  replacedByCode: undefined,
  amendReason: undefined,
  lab: { name: "Laboratoire Agro-Analyses Sétif", address: "Zone industrielle, lot 12, Sétif 19000", phone: "+213 36 00 00 00" },
  client: { name: "Ferme Ben Ali", region: "Sétif" },
  sample: {
    residue: "pomegranate_peels",
    residueName: undefined,
    label: "Peels lot 3, bag B",
    state: "dried",
    collectedAt: T0 - 2 * DAY,
    region: "Sétif",
    grams: 500,
    packaging: "Sealed kraft bag",
    notes: undefined,
  },
  sampleNo: "S-2026-0007",
  condition: "Intact, dry, 21 °C",
  receivedAt: T0,
  testedFrom: T0 + DAY,
  testedTo: T0 + 3 * DAY,
  releasedAt: T0 + 4 * DAY,
  releasedByName: "Dr. Amina Kaci",
  releasedByRole: "manager",
  retention: "30 days",
  results: {
    items: [
      { analysis: "moisture", value: 9.4, qualifier: undefined, uncertainty: 0.3, method: "Oven drying at 103–105 °C to constant mass" },
      { analysis: "punicalagin", value: 112, qualifier: undefined, uncertainty: undefined, method: "HPLC-DAD (α + β anomers)" },
      { analysis: "mold", value: 120000, qualifier: undefined, uncertainty: undefined, method: "Yeasts and moulds, ISO 21527-2 (DG18)" },
      { analysis: "oxidation", value: 0.5, qualifier: "<", uncertainty: undefined, method: "Peroxide value, ISO 3960" },
    ],
    panels: [
      {
        analysis: "heavy_metals",
        method: "ICP-OES",
        lines: [
          { name: "Lead (Pb)", value: 0.12, qualifier: undefined, unit: "mg/kg", limit: 0.3, limitRef: "Reg. (EU) 2023/915", pass: true },
          { name: "Cadmium (Cd)", value: 0.01, qualifier: "nd", unit: "mg/kg", limit: undefined, limitRef: undefined, pass: undefined },
        ],
      },
    ],
    testedFrom: T0 + DAY,
    testedTo: T0 + 3 * DAY,
    deviations: undefined,
  },
};

function render(cert: Certificate, locale: "en" | "ar" = "en") {
  return renderToStaticMarkup(
    createElement(CertificateSheet, {
      cert,
      t: certificateMessages[locale],
      labels: catalogLabels[locale],
      url: `https://biorefmind.vercel.app/verify/${cert.code}`,
      qrSvg: "<svg></svg>",
    }),
  );
}

describe("CertificateSheet", () => {
  it("prints the ISO/IEC 17025 content", () => {
    const html = render(SAMPLE_CERTIFICATE);
    for (const text of [
      "Certificate of analysis",
      "S-2026-0007-R1",
      "Laboratoire Agro-Analyses Sétif",
      "Ferme Ben Ali",
      "Pomegranate peels",
      "S-2026-0007",
      "Intact, dry, 21 °C",
      "2026-10-01",
      "2026-10-05",
      "120,000",
      "CFU/g",
      "&lt; 0.5",
      "± 0.3",
      "Not detected",
      "Conforms",
      "Conformity is assessed against the stated limit without taking measurement uncertainty into account.",
      "Dr. Amina Kaci",
      "Lab manager",
      "30 days",
      "Results apply only to the sample as received. Sampling was done by the customer.",
      "This certificate may not be reproduced except in full.",
      "K7M2QX9TPA4R",
      "End of report",
      "Issued by Laboratoire Agro-Analyses Sétif. BiorefMind hosts this certificate and did not perform the analysis.",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("Superseded");
    expect(html).not.toContain("Amendment");
  });

  it("never prints a phone of the client, a score or a route", () => {
    const html = render(SAMPLE_CERTIFICATE);
    expect(html).not.toMatch(/Score|Route|score|route/);
  });

  it("leaves out the conformity statement when no line was assessed", () => {
    const cert = {
      ...SAMPLE_CERTIFICATE,
      results: { ...SAMPLE_CERTIFICATE.results, panels: [] },
    };
    expect(render(cert)).not.toContain("Conformity is assessed");
  });

  it("marks a replaced version and shows an amendment reason", () => {
    const v1 = render({ ...SAMPLE_CERTIFICATE, replacedByCode: "ZZZZ22223333" });
    expect(v1).toContain("Superseded — replaced by version 2");
    expect(v1).toContain('href="/verify/ZZZZ22223333"');
    const v2 = render({ ...SAMPLE_CERTIFICATE, version: 2, reportNo: "S-2026-0007-R2", amendReason: "Typo in the moisture value." });
    expect(v2).toContain("Amendment: ");
    expect(v2).toContain("Typo in the moisture value.");
  });

  it("renders in Arabic", () => {
    const html = render(SAMPLE_CERTIFICATE, "ar");
    expect(html).toContain("شهادة تحليل");
    expect(html).toContain("نهاية التقرير");
  });
});

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Printer } from "lucide-react";

import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { QUIET, useFormat } from "@/components/dashboard/lab/ui";
import { useMessages } from "@/i18n/provider";
import { catalogLabels, residueLabel } from "@/lib/catalog-labels";
import type { LabQueueRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Only the label is printed: while a label button is on screen, a copy of the label sits at the end
 * of <body>, hidden on screen; the print stylesheet hides everything else.
 */
const PRINT_CSS = `
.lab-print-label { display: none; }
@media print {
  @page { margin: 8mm; }
  body > *:not(.lab-print-label) { display: none !important; }
  body { background: #fff !important; }
  .lab-print-label { display: block !important; }
}
`;

function useQrSvg(text: string): string | null {
  const [svg, setSvg] = useState<{ text: string; svg: string } | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: "svg", margin: 0 })
      .then((s) => {
        if (alive) setSvg({ text, svg: s });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [text]);
  return svg?.text === text ? svg.svg : null;
}

/** The label stuck on the sample bag: sample number (large), client, residue, date and a QR code of the number. */
function Label({ row, qr }: { row: LabQueueRow; qr: string | null }) {
  const t = useMessages(labMessages);
  const labels = useMessages(catalogLabels);
  const f = useFormat();
  return (
    <div className="flex w-[90mm] max-w-full items-center gap-4 rounded-lg border border-black/70 bg-white p-3 text-black">
      <div className="min-w-0 flex-1">
        <p dir="ltr" className="text-[24px] font-bold leading-tight tracking-tight">
          {row.sampleNo}
        </p>
        <p className="mt-1 truncate text-[13px]">
          <span className="text-black/60">{t.label.client}: </span>
          {row.clientName}
        </p>
        <p className="truncate text-[13px]">
          <span className="text-black/60">{t.label.residue}: </span>
          {residueLabel(labels.residues, row.sample)}
        </p>
        {row.receivedAt ? (
          <p className="text-[13px]">
            <span className="text-black/60">{t.label.received}: </span>
            {f.date(row.receivedAt)}
          </p>
        ) : null}
      </div>
      {qr ? (
        // The SVG comes from the qrcode package, built from the sample number only.
        <span className="block size-[26mm] shrink-0 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
      ) : (
        <span className="block size-[26mm] shrink-0 bg-black/5" />
      )}
    </div>
  );
}

/** A preview of the label and a "Print label" button. */
export function SampleLabel({ row, className }: { row: LabQueueRow; className?: string }) {
  const t = useMessages(labMessages);
  const qr = useQrSvg(row.sampleNo ?? "");
  if (!row.sampleNo) return null;
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[13px] font-medium text-muted-foreground">{t.label.title}</p>
      <Label row={row} qr={qr} />
      <button type="button" disabled={!qr} onClick={() => window.print()} className={cn(QUIET, "h-9")}>
        <Printer className="size-4" /> {t.label.print}
      </button>
      {typeof document !== "undefined"
        ? createPortal(
            <div className="lab-print-label">
              <style>{PRINT_CSS}</style>
              <Label row={row} qr={qr} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

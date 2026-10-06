"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { FileText, ImagePlus, ScanText, X } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { fill } from "@/components/dashboard/messages";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { PRIMARY, QUIET, useFail, useGuestBlock } from "@/components/dashboard/lab/ui";
import { useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { shrinkImage } from "@/lib/shrink-image";
import type { LabQueueRow, LabReading } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

// Design: docs/superpowers/specs/2026-10-06-ai-results-reader-design.md

const MAX_PAGES = 4;
type Page = { key: string; blob: Blob; preview: string | null };

let seq = 0;

/** "Fill from a photo or PDF": uploads the lab's pages, asks the reader, hands the values to the form. */
export function ReadSheet({ requestId, onRead }: { requestId: LabQueueRow["requestId"]; onRead: (r: LabReading) => void }) {
  const t = useMessages(labMessages);
  const fail = useFail();
  const blocked = useGuestBlock();
  const uploadUrl = useMutation(api.labAi.uploadUrl);
  const read = useAction(api.labAi.readResults);
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const isPdf = pages.some((p) => p.blob.type === "application/pdf");

  // Free the preview images when pages go away.
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const next: Page[] = [];
    for (const f of Array.from(files)) {
      const pdf = f.type === "application/pdf";
      const blob = pdf ? f : await shrinkImage(f, 2000);
      const preview = pdf ? null : URL.createObjectURL(blob);
      if (preview) previews.current.push(preview);
      next.push({ key: `p${++seq}`, blob, preview });
    }
    // One PDF on its own, or up to 4 photos: a PDF replaces photos and the other way round.
    setPages((cur) => {
      const merged = next.some((p) => p.blob.type === "application/pdf")
        ? next.filter((p) => p.blob.type === "application/pdf").slice(-1)
        : [...cur.filter((p) => p.blob.type !== "application/pdf"), ...next];
      return merged.slice(0, MAX_PAGES);
    });
    if (input.current) input.current.value = "";
  }

  async function go() {
    if (blocked() || pages.length === 0) return;
    setBusy(true);
    try {
      const files: Id<"_storage">[] = [];
      for (const p of pages) {
        const url = await uploadUrl({ requestId });
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": p.blob.type || "application/octet-stream" }, body: p.blob });
        if (!res.ok) throw new Error(t.reader.title);
        files.push(((await res.json()) as { storageId: Id<"_storage"> }).storageId);
      }
      onRead(await read({ requestId, files }));
      setPages([]);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet/15 bg-violet/[0.06] p-3.5 sm:p-4">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <ScanText className="size-[18px] text-violet" strokeWidth={1.9} />
        {t.reader.title}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#2e2a6b]/85">{t.reader.body}</p>

      {pages.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {pages.map((p, i) => (
            <li key={p.key} className="relative">
              {p.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local preview (blob: URL), not an optimisable image
                <img src={p.preview} alt={fill(t.reader.page, { n: i + 1 })} className="size-16 rounded-xl border border-white object-cover" />
              ) : (
                <span className="flex size-16 flex-col items-center justify-center gap-1 rounded-xl border border-white bg-white/80 text-[12px] font-medium">
                  <FileText className="size-5 text-violet" /> {t.reader.pdf}
                </span>
              )}
              {!busy ? (
                <button
                  type="button"
                  aria-label={`${t.reader.clear} ${i + 1}`}
                  onClick={() => setPages((cur) => cur.filter((x) => x.key !== p.key))}
                  className="absolute -end-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-white"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          hidden
          onChange={(e) => void add(e.target.files)}
        />
        {!isPdf && pages.length < MAX_PAGES ? (
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={cn(QUIET, "h-9 px-3.5 text-[13px]")}>
            <ImagePlus className="size-4" /> {t.reader.add}
          </button>
        ) : null}
        {pages.length > 0 ? (
          <button type="button" disabled={busy} onClick={go} className={cn(PRIMARY, "h-9 px-4 text-[13px]")}>
            {busy ? (
              <>
                <Spinner size="sm" label={null} /> {t.reader.reading}
              </>
            ) : (
              <>
                <ScanText className="size-4" /> {t.reader.read}
              </>
            )}
          </button>
        ) : null}
      </div>
    </section>
  );
}

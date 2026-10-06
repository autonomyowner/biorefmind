"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { FileText, ImagePlus, ScanText, X } from "lucide-react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { fill } from "@/components/dashboard/messages";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { PRIMARY, QUIET, useFail, useGuestBlock } from "@/components/dashboard/lab/ui";
import { useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { shrinkImage } from "@/lib/shrink-image";
import type { LabQueueRow, LabReading } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";
import { READ_REFUSE } from "../../../../convex/lib/aiRead";
import { MARKET_REFUSE } from "../../../../convex/lib/market";

// Design: docs/superpowers/specs/2026-10-06-ai-results-reader-design.md

const MAX_PAGES = 4;
/** `storageId` once uploaded, so a retry after a refusal doesn't upload the page again. */
type Page = { key: string; blob: Blob; preview: string | null; storageId?: Id<"_storage"> };
/** After these, the backend has deleted the pages: upload them again next time. */
const PAGES_GONE: string[] = [READ_REFUSE.failed, READ_REFUSE.fileType, MARKET_REFUSE.photoMissing];

let seq = 0;
const isPdf = (p: Page) => p.blob.type === "application/pdf";
const free = (pages: Page[]) => pages.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));

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
  const hasPdf = pages.some(isPdf);

  // Free the previews still shown when the card goes away.
  const current = useRef(pages);
  useEffect(() => {
    current.current = pages;
  }, [pages]);
  useEffect(() => () => free(current.current), []);

  function replace(next: Page[]) {
    free(pages.filter((p) => !next.includes(p)));
    setPages(next);
  }

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const chosen = Array.from(files);
    if (input.current) input.current.value = "";
    const added: Page[] = [];
    for (const f of chosen) {
      const pdf = f.type === "application/pdf";
      const blob = pdf ? f : await shrinkImage(f, 2000);
      added.push({ key: `p${++seq}`, blob, preview: pdf ? null : URL.createObjectURL(blob) });
    }
    // One PDF on its own, or up to 4 photos: a PDF replaces photos and the other way round.
    const pdfs = added.filter(isPdf);
    const next = (pdfs.length ? pdfs.slice(-1) : [...pages.filter((p) => !isPdf(p)), ...added]).slice(0, MAX_PAGES);
    if (next.length < (pdfs.length ? chosen.length : pages.filter((p) => !isPdf(p)).length + added.length)) toast(t.reader.dropped);
    free(added.filter((p) => !next.includes(p)));
    replace(next);
  }

  async function go() {
    if (blocked() || pages.length === 0) return;
    setBusy(true);
    const uploaded = [...pages];
    try {
      for (const [i, p] of uploaded.entries()) {
        if (p.storageId) continue;
        const url = await uploadUrl({ requestId });
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": p.blob.type || "application/octet-stream" }, body: p.blob });
        if (!res.ok) throw new Error(READ_REFUSE.failed);
        uploaded[i] = { ...p, storageId: ((await res.json()) as { storageId: Id<"_storage"> }).storageId };
      }
      onRead(await read({ requestId, files: uploaded.map((p) => p.storageId!) }));
      replace([]);
    } catch (err) {
      // Keep what was uploaded for a retry, unless the backend has already deleted it.
      setPages(PAGES_GONE.includes(errorMessage(err)) ? uploaded.map((p) => ({ ...p, storageId: undefined })) : uploaded);
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
                  aria-label={fill(t.reader.removePage, { n: i + 1 })}
                  onClick={() => replace(pages.filter((x) => x.key !== p.key))}
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
        {!hasPdf && pages.length < MAX_PAGES ? (
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

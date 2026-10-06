"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ArrowUp, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { assistantMessages } from "@/components/dashboard/assistant/assistant-messages";
import { fill } from "@/components/dashboard/messages";
import { Spinner } from "@/components/ui/spinner";
import { useMessages } from "@/i18n/provider";
import { shrinkImage } from "@/lib/shrink-image";
import { cn } from "@/lib/utils";

export type Draft = { text: string; photos: Blob[] };
export type ComposerHandle = { set: (text: string, askPhoto: boolean) => void; addFiles: (files: File[]) => void };

const MAX_PHOTOS = 4;
const IMAGE = /^image\/(jpeg|png|webp)$/;
type Pic = { key: string; blob: Blob; url: string };
let seq = 0;

/**
 * The message box: text (Enter sends, Shift+Enter new line), up to 4 photos (button, drag-and-drop, paste;
 * the camera on phones). Photos are shrunk to 1600 px before upload.
 */
export const Composer = forwardRef<ComposerHandle, { busy: boolean; disabled: boolean; onSend: (d: Draft) => Promise<boolean> }>(function Composer(
  { busy, disabled, onSend },
  ref,
) {
  const t = useMessages(assistantMessages);
  const [text, setText] = useState("");
  const [pics, setPics] = useState<Pic[]>([]);
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const live = useRef(pics);
  useEffect(() => {
    live.current = pics;
  }, [pics]);
  useEffect(() => () => live.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // Grow with the text, up to about 8 lines.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  async function addFiles(files: File[]) {
    const images = files.filter((f) => IMAGE.test(f.type) || f.type === "");
    const room = MAX_PHOTOS - pics.length;
    if (images.length > room) toast(t.composer.tooMany);
    const added: Pic[] = [];
    for (const f of images.slice(0, Math.max(0, room))) {
      const blob = await shrinkImage(f, 1600);
      added.push({ key: `a${++seq}`, blob, url: URL.createObjectURL(blob) });
    }
    if (added.length) {
      setPics((cur) => {
        const next = [...cur, ...added];
        next.slice(MAX_PHOTOS).forEach((p) => URL.revokeObjectURL(p.url));
        return next.slice(0, MAX_PHOTOS);
      });
    }
  }

  useImperativeHandle(ref, () => ({
    set(value: string, askPhoto: boolean) {
      setText(value);
      requestAnimationFrame(() => {
        area.current?.focus();
        area.current?.setSelectionRange(value.length, value.length);
        if (askPhoto) input.current?.click();
      });
    },
    addFiles: (files: File[]) => void addFiles(files),
  }));

  function removePic(key: string) {
    setPics((cur) => {
      const gone = cur.find((p) => p.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return cur.filter((p) => p.key !== key);
    });
  }

  const canSend = !disabled && !busy && !sending && (text.trim().length > 0 || pics.length > 0);

  async function send() {
    if (!canSend) return;
    setSending(true);
    const ok = await onSend({ text: text.trim(), photos: pics.map((p) => p.blob) });
    setSending(false);
    if (ok) {
      // Everything shown when it was sent (and anything added meanwhile) goes.
      setPics((cur) => {
        cur.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      setText("");
    }
  }

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) void addFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "glass relative rounded-[26px] p-2 shadow-[0_24px_50px_-30px_rgba(40,60,170,0.55)] transition-shadow",
        dragging && "ring-2 ring-violet/50",
      )}
    >
      {dragging ? (
        <p className="absolute inset-0 z-10 flex items-center justify-center rounded-[26px] bg-white/85 text-[15px] font-semibold text-violet">{t.composer.drop}</p>
      ) : null}
      {pics.length ? (
        <ul className="flex flex-wrap gap-2 px-2 pt-2">
          {pics.map((p, i) => (
            <li key={p.key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob: URL) */}
              <img src={p.url} alt="" className="size-16 rounded-xl border border-white object-cover" />
              <button
                type="button"
                aria-label={fill(t.composer.removePhoto, { n: i + 1 })}
                onClick={() => removePic(p.key)}
                className="absolute -end-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-white"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-end gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={disabled || pics.length >= MAX_PHOTOS}
          onClick={() => input.current?.click()}
          aria-label={t.composer.addPhoto}
          title={t.composer.addPhoto}
          className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-violet transition-colors hover:bg-violet/[0.08] disabled:opacity-40"
        >
          <ImagePlus className="size-[22px]" strokeWidth={1.8} />
        </button>
        <textarea
          ref={area}
          rows={1}
          dir="auto"
          value={text}
          disabled={disabled}
          maxLength={2000}
          placeholder={disabled ? t.composer.guest : t.composer.placeholder}
          aria-label={t.composer.placeholder}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) {
              e.preventDefault();
              void addFiles(files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          className="max-h-[220px] min-h-11 flex-1 resize-none bg-transparent px-1 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/80"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          aria-label={sending ? t.composer.sending : t.composer.send}
          className="btn-navy mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full transition-[filter,opacity] hover:brightness-110 disabled:opacity-35"
        >
          {sending || busy ? <Spinner size="sm" label={null} /> : <ArrowUp className="size-5" strokeWidth={2.2} />}
        </button>
      </div>
    </div>
  );
});

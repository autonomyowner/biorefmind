"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  Camera,
  ChartColumn,
  FlaskConical,
  HandCoins,
  Leaf,
  MessageSquareText,
  MessagesSquare,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { assistantMessages } from "@/components/dashboard/assistant/assistant-messages";
import { Composer, type ComposerHandle, type Draft } from "@/components/dashboard/assistant/composer";
import { AssistantAnswer, UserMessage } from "@/components/dashboard/assistant/message-view";
import { SAMPLE_CHAT } from "@/components/dashboard/assistant/sample";
import { DASH } from "@/components/dashboard/links";
import { fill } from "@/components/dashboard/messages";
import { useDashboard } from "@/components/dashboard/shell";
import { useDashHref } from "@/components/dashboard/use-dash-href";
import { FadeIn } from "@/components/motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import type { AssistantMessage, AssistantThread } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

// Design: docs/superpowers/specs/2026-10-06-ai-assistant-design.md

const ICONS: Record<string, LucideIcon> = {
  camera: Camera,
  offers: HandCoins,
  leaf: Leaf,
  lab: FlaskConical,
  search: Search,
  chart: ChartColumn,
  calendar: CalendarClock,
  message: MessageSquareText,
  money: Wallet,
};

function greetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

/** The dashboard assistant: conversations on the start side, the chat, and the message box pinned to the bottom. */
export function AssistantPage() {
  const { workspace, viewer, guest } = useDashboard();
  const t = useMessages(assistantMessages);
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const href = useDashHref();
  const composer = useRef<ComposerHandle>(null);
  const [drawer, setDrawer] = useState(false);

  const threadId = (params.get("t") as Id<"aiThreads"> | null) ?? null;
  const threads = useQuery(api.assistant.threads, guest ? "skip" : { companyId: workspace.companyId });
  // A conversation started here is known before the list catches up with it.
  const [created, setCreated] = useState<ReadonlySet<string>>(new Set());
  const known = !threadId || guest || created.has(threadId) || threads?.some((x) => x.threadId === threadId);
  const live = useQuery(api.assistant.messages, !guest && threadId && known ? { threadId } : "skip");
  const gone = live === null; // deleted (maybe in another tab)
  const messages: AssistantMessage[] | undefined = guest ? SAMPLE_CHAT[locale] : threadId ? (known && !gone ? live : []) : [];

  const uploadUrl = useMutation(api.assistant.uploadUrl);
  const send = useMutation(api.assistant.send);
  const busy = messages?.at(-1)?.status === "streaming";

  function openThread(id: string | null) {
    setDrawer(false);
    router.replace(href(id ? `${DASH.assistant}?t=${id}` : DASH.assistant), { scroll: false });
  }

  // A thread that no longer exists (deleted elsewhere): back to a new conversation.
  useEffect(() => {
    if (!guest && threadId && ((threads && !known) || gone)) router.replace(href(DASH.assistant));
  }, [guest, threadId, threads, known, gone, router, href]);

  async function onSend(d: Draft): Promise<boolean> {
    if (guest) {
      toast(t.composer.guest);
      return false;
    }
    try {
      const photoIds: Id<"_storage">[] = [];
      for (const blob of d.photos) {
        const url = await uploadUrl({ companyId: workspace.companyId });
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
        if (!res.ok) throw new Error(t.message.failed);
        photoIds.push(((await res.json()) as { storageId: Id<"_storage"> }).storageId);
      }
      const out = await send({ companyId: workspace.companyId, threadId: threadId ?? undefined, text: d.text, photoIds });
      if (out.threadId !== threadId) {
        setCreated((s) => new Set(s).add(out.threadId));
        openThread(out.threadId);
      }
      return true;
    } catch (err) {
      toast.error(localizeBackendError(errorMessage(err), locale));
      return false;
    }
  }

  // Follow the answer while it streams, unless the person scrolled up to read.
  const end = useRef<HTMLDivElement>(null);
  const lastText = messages?.at(-1)?.text.length ?? 0;
  const count = messages?.length ?? 0;
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const near = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 320;
    if (near || count <= 2) el.scrollIntoView({ block: "end", behavior: count <= 2 ? "auto" : "smooth" });
  }, [count, lastText]);

  const allPhotos = (messages ?? []).flatMap((m) => m.photos);
  const firstName = viewer.name.split(" ")[0] || viewer.name;
  const empty = messages !== undefined && messages.length === 0;

  const list = (
    <ThreadList
      threads={guest ? [] : threads}
      current={threadId}
      onOpen={openThread}
      onDeleted={(id) => {
        if (id === threadId) openThread(null);
        setCreated((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }}
    />
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-24">{list}</div>
      </aside>

      <section className="flex min-h-[calc(100dvh-9.5rem)] min-w-0 flex-col">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 bg-white/60 px-4 text-[14px] font-medium"
          >
            <MessagesSquare className="size-4 text-violet" /> {t.threads.open}
          </button>
          {threadId ? (
            <button type="button" onClick={() => openThread(null)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-azure">
              <Plus className="size-4" /> {t.threads.new}
            </button>
          ) : null}
        </div>
        <Dialog open={drawer} onOpenChange={setDrawer}>
          <DialogContent className="max-h-[80dvh] overflow-y-auto">
            <DialogTitle className="sr-only">{t.threads.title}</DialogTitle>
            {list}
          </DialogContent>
        </Dialog>

        <div className="flex-1">
          {messages === undefined ? (
            <Spinner className="flex py-24" />
          ) : empty ? (
            <Welcome
              name={firstName}
              kind={workspace.kind}
              onPick={(prompt, photo) => composer.current?.set(prompt, photo)}
            />
          ) : (
            <ol data-chat className="space-y-7 pb-16">
              {messages.map((m) => (
                <li key={m.messageId}>
                  {m.role === "user" ? <UserMessage message={m} /> : <AssistantAnswer message={m} photos={allPhotos} canAct={!guest} />}
                </li>
              ))}
            </ol>
          )}
          <div ref={end} />
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 bg-gradient-to-t from-background via-background/95 to-transparent px-1 pt-6 pb-4">
          <Composer ref={composer} busy={busy} disabled={guest} onSend={onSend} />
          <p className="mt-2 text-center text-[12px] text-muted-foreground">{guest ? t.composer.guest : t.composer.footer}</p>
        </div>
      </section>
    </div>
  );
}

function Welcome({ name, kind, onPick }: { name: string; kind: "farm" | "factory" | "lab"; onPick: (prompt: string, photo: boolean) => void }) {
  const t = useMessages(assistantMessages);
  const items = t.suggestions[kind] as readonly { icon: string; text: string; prompt: string; photo?: boolean }[];
  return (
    <div className="flex flex-col items-center pt-6 text-center sm:pt-14">
      <FadeIn>
        <span className="orb mx-auto flex size-14 items-center justify-center rounded-full">
          <Sparkles className="size-6" strokeWidth={1.8} />
        </span>
        <h1 className="mt-5 text-[30px] leading-tight font-semibold tracking-[-0.03em] sm:text-[38px]">
          {fill(t.greeting[greetingKey()], { name })}
          <span className="text-gradient block">{t.lead}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{t.leadBody}</p>
      </FadeIn>
      <ul className="mt-8 grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
        {items.map((s, i) => {
          const Icon = ICONS[s.icon] ?? Sparkles;
          return (
            <FadeIn as="li" key={s.text} index={i + 1}>
              <button
                type="button"
                onClick={() => onPick(s.prompt, !!s.photo)}
                className="glass flex h-full w-full items-start gap-3 rounded-[22px] p-4 text-start transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(40,60,170,0.55)]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet/[0.1] text-violet">
                  <Icon className="size-[18px]" strokeWidth={1.9} />
                </span>
                <span className="pt-1.5 text-[15px] font-medium leading-snug">{s.text}</span>
              </button>
            </FadeIn>
          );
        })}
      </ul>
    </div>
  );
}

function ThreadList({
  threads,
  current,
  onOpen,
  onDeleted,
}: {
  threads: AssistantThread[] | undefined;
  current: string | null;
  onOpen: (id: string | null) => void;
  onDeleted: (id: string) => void;
}) {
  const t = useMessages(assistantMessages);
  const locale = useLocale();
  const rename = useMutation(api.assistant.rename);
  const remove = useMutation(api.assistant.remove);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fail = (err: unknown) => toast.error(localizeBackendError(errorMessage(err), locale));

  return (
    <nav aria-label={t.threads.title}>
      <button
        type="button"
        onClick={() => onOpen(null)}
        className="btn-navy flex h-11 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
      >
        <Plus className="size-4" /> {t.threads.new}
      </button>
      <p className="mt-5 mb-2 px-2 text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{t.threads.title}</p>
      {threads === undefined ? (
        <Spinner size="sm" className="flex py-4" />
      ) : threads.length === 0 ? (
        <p className="px-2 text-[14px] text-muted-foreground">{t.threads.empty}</p>
      ) : (
        <ul className="max-h-[calc(100dvh-16rem)] space-y-0.5 overflow-y-auto pe-1">
          {threads.map((th) => (
            <li key={th.threadId}>
              {editing === th.threadId ? (
                <form
                  className="flex gap-1.5 p-1"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await rename({ threadId: th.threadId, title });
                      setEditing(null);
                    } catch (err) {
                      fail(err);
                    }
                  }}
                >
                  <input
                    autoFocus
                    dir="auto"
                    value={title}
                    maxLength={80}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                    aria-label={t.threads.rename}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-foreground/15 bg-white px-2.5 text-[14px] outline-none focus-visible:border-azure/60"
                  />
                  <button type="submit" className="rounded-lg px-2 text-[13px] font-semibold text-azure">
                    {t.threads.save}
                  </button>
                </form>
              ) : deleting === th.threadId ? (
                <div className="rounded-xl bg-destructive/[0.05] p-2.5 text-[13px]">
                  <p>{t.threads.removeConfirm}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-destructive px-3 py-1 font-semibold text-white"
                      onClick={async () => {
                        // Leave the conversation first, so the page never reads a deleted thread.
                        onDeleted(th.threadId);
                        try {
                          await remove({ threadId: th.threadId });
                        } catch (err) {
                          fail(err);
                        }
                        setDeleting(null);
                      }}
                    >
                      {t.threads.yes}
                    </button>
                    <button type="button" className="rounded-full px-3 py-1 font-medium" onClick={() => setDeleting(null)}>
                      {t.threads.no}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "group flex items-center rounded-xl transition-colors",
                    current === th.threadId ? "bg-white shadow-[0_8px_20px_-16px_rgba(20,30,120,0.6)]" : "hover:bg-white/60",
                  )}
                >
                  <button type="button" onClick={() => onOpen(th.threadId)} dir="auto" className="min-w-0 flex-1 truncate px-3 py-2.5 text-start text-[14px]">
                    {th.title}
                  </button>
                  <span className="flex shrink-0 opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`${t.threads.rename}: ${th.title}`}
                      onClick={() => {
                        setTitle(th.title);
                        setEditing(th.threadId);
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${t.threads.remove}: ${th.title}`}
                      onClick={() => setDeleting(th.threadId)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

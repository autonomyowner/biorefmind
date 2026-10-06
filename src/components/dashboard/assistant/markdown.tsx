import { Fragment } from "react";

import { parseBlocks, parseInline } from "@/components/dashboard/assistant/markdown-parse";
import { cn } from "@/lib/utils";

// Renders markdown-parse blocks as React text: no HTML from the model ever reaches the page.

function Inlines({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.t === "bold" ? (
          <strong key={i} className="font-semibold text-foreground">
            {p.v}
          </strong>
        ) : p.t === "italic" ? (
          <em key={i}>{p.v}</em>
        ) : p.t === "code" ? (
          <code key={i} dir="ltr" className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[0.92em]">
            {p.v}
          </code>
        ) : (
          <Fragment key={i}>{p.v}</Fragment>
        ),
      )}
    </>
  );
}

/** The assistant's answer, laid out. `dir="auto"` per block so Arabic and English each read the right way. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-[15px] leading-relaxed text-foreground/90", className)}>
      {parseBlocks(text).map((b, i) => {
        if (b.t === "heading")
          return (
            <p key={i} dir="auto" className="pt-1 text-[16px] font-semibold text-foreground">
              <Inlines text={b.v} />
            </p>
          );
        if (b.t === "para")
          return (
            <p key={i} dir="auto" className="whitespace-pre-line">
              <Inlines text={b.v} />
            </p>
          );
        if (b.t === "table")
          return (
            <div key={i} className="overflow-x-auto rounded-2xl border border-white bg-white/70">
              <table dir="auto" className="w-full min-w-max text-[14px]">
                <thead>
                  <tr className="border-b border-foreground/[0.07] bg-azure/[0.05]">
                    {b.head.map((h, j) => (
                      <th key={j} className="px-3.5 py-2 text-start font-semibold">
                        <Inlines text={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.06]">
                  {b.rows.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, k) => (
                        <td key={k} className="px-3.5 py-2">
                          <Inlines text={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        const List = b.t === "ul" ? "ul" : "ol";
        return (
          <List key={i} dir="auto" className={cn("space-y-1 ps-5", b.t === "ul" ? "list-disc marker:text-violet" : "list-decimal marker:font-semibold marker:text-violet")}>
            {b.items.map((it, j) => (
              <li key={j}>
                <Inlines text={it} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

// A small, safe reader for the assistant's markdown: paragraphs, ### headings, lists, tables, **bold**, *italic*
// and `code`. Pure parsing; markdown.tsx renders it as React text, so no HTML from the model reaches the page.

export type Inline = { t: "text" | "bold" | "italic" | "code"; v: string };
export type Block =
  | { t: "para"; v: string }
  | { t: "heading"; v: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[]; start: number }
  | { t: "hr" }
  | { t: "table"; head: string[]; rows: string[][] };

const INLINE = /\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|`([^`\n]+?)`/g;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let from = 0;
  for (const m of s.matchAll(INLINE)) {
    if (m.index > from) out.push({ t: "text", v: s.slice(from, m.index) });
    out.push(m[1] !== undefined ? { t: "bold", v: m[1] } : m[2] !== undefined ? { t: "italic", v: m[2] } : { t: "code", v: m[3] });
    from = m.index + m[0].length;
  }
  if (from < s.length) out.push({ t: "text", v: s.slice(from) });
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
const isSeparator = (line: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());

export function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: "para", v: para.join("\n") });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      out.push({ t: "hr" });
      continue;
    }
    const heading = /^#{1,4}\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      out.push({ t: "heading", v: heading[1] });
      continue;
    }
    if (trimmed.startsWith("|") && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      flush();
      const head = cells(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      i--;
      out.push({ t: "table", head, rows });
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      flush();
      const last = out.at(-1);
      if (last?.t === "ul") last.items.push(bullet[1]);
      else out.push({ t: "ul", items: [bullet[1]] });
      continue;
    }
    if (numbered) {
      flush();
      // A numbered list interrupted by bullets keeps its own numbers ("2." stays 2).
      const last = out.at(-1);
      if (last?.t === "ol") last.items.push(numbered[2]);
      else out.push({ t: "ol", items: [numbered[2]], start: Number(numbered[1]) });
      continue;
    }
    // A plain line right after a list continues as a paragraph.
    para.push(trimmed);
  }
  flush();
  return out;
}

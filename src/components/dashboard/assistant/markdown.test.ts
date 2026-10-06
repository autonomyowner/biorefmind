import { describe, expect, test } from "vitest";
import { parseBlocks, parseInline } from "./markdown-parse";

describe("parseInline", () => {
  test("bold, italic and code; everything else is plain text (no HTML)", () => {
    expect(parseInline("A **big** deal, *really* and `S-2026-0001` <b>x</b>")).toEqual([
      { t: "text", v: "A " },
      { t: "bold", v: "big" },
      { t: "text", v: " deal, " },
      { t: "italic", v: "really" },
      { t: "text", v: " and " },
      { t: "code", v: "S-2026-0001" },
      { t: "text", v: " <b>x</b>" },
    ]);
  });
  test("an unclosed marker stays as text", () => {
    expect(parseInline("2 ** 3")).toEqual([{ t: "text", v: "2 ** 3" }]);
  });
});

describe("parseBlocks", () => {
  test("paragraphs, headings, bullet and numbered lists", () => {
    const blocks = parseBlocks("### Prices\nHere is what I found:\n\n- Sétif: 18 DA\n- Blida: 15 DA\n\n1. Dry it\n2. Bag it");
    expect(blocks.map((b) => b.t)).toEqual(["heading", "para", "ul", "ol"]);
    expect(blocks[2]).toMatchObject({ t: "ul", items: ["Sétif: 18 DA", "Blida: 15 DA"] });
    expect(blocks[3]).toMatchObject({ t: "ol", items: ["Dry it", "Bag it"] });
  });

  test("tables with a header row; the separator row is dropped", () => {
    const [table] = parseBlocks("| Lab | Price |\n|---|---:|\n| Nour | 1,500 DA |\n| Hodna | 1,800 DA |");
    expect(table).toEqual({ t: "table", head: ["Lab", "Price"], rows: [["Nour", "1,500 DA"], ["Hodna", "1,800 DA"]] });
  });

  test("a numbered list split by bullets keeps its numbers; --- is a divider", () => {
    const blocks = parseBlocks("1. First\n- detail\n2. Second\n\n---\n\nDone");
    expect(blocks).toEqual([
      { t: "ol", items: ["First"], start: 1 },
      { t: "ul", items: ["detail"] },
      { t: "ol", items: ["Second"], start: 2 },
      { t: "hr" },
      { t: "para", v: "Done" },
    ]);
  });

  test("an empty answer is no blocks", () => {
    expect(parseBlocks("  \n ")).toEqual([]);
  });
});

import { describe, expect, test } from "vitest";
import {
  cleanAnswer,
  cleanCard,
  cleanQuestion,
  cleanToolArgs,
  ASSIST_REFUSE,
  StreamReader,
  systemPrompt,
  titleFrom,
  toolsFor,
} from "./assistant";

const sse = (...events: object[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";

describe("StreamReader", () => {
  test("text deltas, split anywhere, and the cost at the end", () => {
    const body = sse(
      { choices: [{ delta: { content: "Hel" } }] },
      { choices: [{ delta: { content: "lo " } }] },
      { choices: [{ delta: { content: "Saïd" } }] },
      { choices: [{ delta: {} }], usage: { cost: 0.0021 } },
    );
    const r = new StreamReader();
    const texts: string[] = [];
    // Feed in awkward pieces, as the network does.
    for (let i = 0; i < body.length; i += 7) texts.push(...r.push(body.slice(i, i + 7)));
    expect(texts.join("")).toBe("Hello Saïd");
    expect(r.done).toBe(true);
    expect(r.costUsd).toBe(0.0021);
    expect(r.toolCalls()).toEqual([]);
  });

  test("tool calls arrive in pieces and are joined by index", () => {
    const body = sse(
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", type: "function", function: { name: "search_lots", arguments: "" } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"resid' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'ue":"olive_pomace"}' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 1, id: "c2", function: { name: "my_sales", arguments: "{}" } }] } }] },
    );
    const r = new StreamReader();
    r.push(body);
    expect(r.toolCalls()).toEqual([
      { id: "c1", name: "search_lots", arguments: '{"residue":"olive_pomace"}' },
      { id: "c2", name: "my_sales", arguments: "{}" },
    ]);
  });

  test("comment lines and keep-alives are ignored", () => {
    const r = new StreamReader();
    expect(r.push(": OPENROUTER PROCESSING\n\n" + sse({ choices: [{ delta: { content: "ok" } }] }))).toEqual(["ok"]);
  });
});

describe("toolsFor", () => {
  const names = (k: "farm" | "factory" | "lab") => toolsFor(k).map((t) => t.function.name);
  test("each account gets its own tools, plus the shared ones", () => {
    expect(names("farm")).toEqual(
      expect.arrayContaining(["search_lots", "price_guide", "lab_directory", "my_sales", "my_listings", "my_offers_received", "my_lab_tests", "propose_listing", "propose_lab_request"]),
    );
    expect(names("farm")).not.toContain("propose_offer");
    expect(names("factory")).toEqual(expect.arrayContaining(["my_offers", "propose_offer", "propose_lab_request"]));
    expect(names("factory")).not.toContain("propose_listing");
    expect(names("lab")).toEqual(expect.arrayContaining(["lab_queue", "lab_month", "read_sheet", "propose_results"]));
    expect(names("lab")).not.toContain("propose_lab_request");
    expect(names("lab")).not.toContain("my_sales");
  });
});

describe("cleanToolArgs", () => {
  test("search_lots keeps known residues, trims region, positive max price", () => {
    expect(cleanToolArgs("search_lots", '{"residue":"olive_pomace","region":"  Sétif ","max_price":10}')).toEqual({
      residue: "olive_pomace",
      region: "Sétif",
      maxPrice: 10,
    });
    expect(cleanToolArgs("search_lots", '{"residue":"gold","max_price":-3}')).toEqual({});
    expect(cleanToolArgs("search_lots", "not json")).toEqual({});
  });

  test("lab_queue status and read_sheet request id", () => {
    expect(cleanToolArgs("lab_queue", '{"status":"received"}')).toEqual({ status: "received" });
    expect(cleanToolArgs("lab_queue", '{"status":"weird"}')).toEqual({});
    expect(cleanToolArgs("read_sheet", '{"request_id":"S-2026-0001"}')).toEqual({ request: "S-2026-0001" });
  });
});

describe("cleanCard", () => {
  test("listing: catalog residue, numbers in range, note cleaned", () => {
    expect(
      cleanCard("propose_listing", JSON.stringify({ residue: "pomegranate_peels", quantity_kg: 1200, price_dzd_per_kg: 18.5, note: "Dried, call 0555 12 34 56", use_photos: true })),
    ).toEqual({ type: "listing", residue: "pomegranate_peels", quantityKg: 1200, priceDzdPerKg: 18.5, note: "Dried, call •••", usePhotos: true });
    expect(cleanCard("propose_listing", JSON.stringify({ residue: "other", residue_name: "Fig leaves", quantity_kg: -4 }))).toEqual({
      type: "listing",
      residue: "other",
      residueName: "Fig leaves",
      usePhotos: false,
    });
    expect(cleanCard("propose_listing", JSON.stringify({ residue: "gold" }))).toBeNull();
  });

  test("lab request needs at least one known analysis", () => {
    expect(cleanCard("propose_lab_request", JSON.stringify({ analyses: ["moisture", "magic", "moisture"], lab_id: "x1" }))).toEqual({
      type: "lab_request",
      analyses: ["moisture"],
      labId: "x1",
    });
    expect(cleanCard("propose_lab_request", JSON.stringify({ analyses: ["magic"] }))).toBeNull();
  });

  test("offer needs a lot; results need a request", () => {
    expect(cleanCard("propose_offer", JSON.stringify({ listing_id: "l1", quantity_kg: 500, price_dzd_per_kg: 9 }))).toEqual({
      type: "offer",
      listingId: "l1",
      quantityKg: 500,
      priceDzdPerKg: 9,
    });
    expect(cleanCard("propose_offer", "{}")).toBeNull();
    expect(cleanCard("propose_results", JSON.stringify({ request_id: "S-2026-0001" }))).toEqual({ type: "results", request: "S-2026-0001" });
  });
});

describe("questions, titles, answers, prompt", () => {
  test("cleanQuestion: 1–2000 characters, or empty with photos", () => {
    expect(cleanQuestion("  hi  ", 0)).toBe("hi");
    expect(cleanQuestion("", 1)).toBe("");
    expect(() => cleanQuestion("   ", 0)).toThrow(ASSIST_REFUSE.empty);
    expect(() => cleanQuestion("x".repeat(2001), 0)).toThrow(ASSIST_REFUSE.empty);
  });

  test("titleFrom: the question's first line, up to 60 characters", () => {
    expect(titleFrom("What is this worth?\nmore", false)).toBe("What is this worth?");
    expect(titleFrom("x".repeat(80), false)).toHaveLength(60);
    expect(titleFrom("", true)).toBe("Photo");
  });

  test("cleanAnswer masks phone numbers", () => {
    expect(cleanAnswer("Call 0555 12 34 56 now")).toBe("Call ••• now");
  });

  test("the system prompt names the account, the date and the privacy rules", () => {
    const p = systemPrompt({ kind: "farm", workspace: "Ferme Saïd", firstName: "Saïd", today: "2026-10-06" });
    expect(p).toContain("farm");
    expect(p).toContain("2026-10-06");
    expect(p).toMatch(/never.*phone/i);
    expect(p).toContain("propose_listing");
    expect(p).toMatch(/Never show internal ids/);
  });
});

import { describe, expect, test } from "vitest";
import { AI_REFUSE, cleanKey, cleanModel, maskKey, parsePhotoCheck, photoCheckPrompt, utcDay } from "./ai";

const good = {
  match: "yes",
  seen: { en: "Dried pomegranate peels in bags.", ar: "قشور رمان مجففة في أكياس." },
  state: "dried",
  concerns: ["browning"],
  tip: { en: "Add one close-up in daylight.", ar: "أضف صورة قريبة في ضوء النهار." },
};

describe("keys", () => {
  test("cleanKey keeps an OpenRouter key and refuses anything else", () => {
    expect(cleanKey("  sk-or-v1-abcdef0123456789  ")).toBe("sk-or-v1-abcdef0123456789");
    for (const bad of ["", "sk-abc", "sk-or-short", "sk-or-v1-" + "a".repeat(300), "sk-or-v1-abc def 0123456789"]) {
      expect(() => cleanKey(bad)).toThrow(AI_REFUSE.key);
    }
  });

  test("maskKey shows only the start and the last 4 characters", () => {
    expect(maskKey("sk-or-v1-5ebb3f6aa7207e2e9fc9")).toBe("sk-or-…9fc9");
    expect(maskKey(undefined)).toBe("");
  });
});

describe("cleanModel", () => {
  test("provider/model, up to 100 characters", () => {
    expect(cleanModel(" google/gemini-3.8-flash ")).toBe("google/gemini-3.8-flash");
    expect(cleanModel("~anthropic/claude-haiku-latest")).toBe("~anthropic/claude-haiku-latest");
    expect(cleanModel("openai/gpt-5-mini:batch")).toBe("openai/gpt-5-mini:batch");
    for (const bad of ["", "gemini", "google/", "/x", "a/b c", "a/" + "b".repeat(100)]) {
      expect(() => cleanModel(bad)).toThrow(AI_REFUSE.model);
    }
  });
});

describe("parsePhotoCheck", () => {
  test("a good answer, as JSON text or inside a code fence", () => {
    expect(parsePhotoCheck(JSON.stringify(good))).toEqual(good);
    expect(parsePhotoCheck("```json\n" + JSON.stringify(good) + "\n```")).toEqual(good);
  });

  test("unknown concerns are dropped and duplicates removed", () => {
    const r = parsePhotoCheck(JSON.stringify({ ...good, concerns: ["mould", "aliens", "mould", "wet"] }));
    expect(r?.concerns).toEqual(["mould", "wet"]);
  });

  test("free text is trimmed, capped at 160 characters and has phone numbers masked", () => {
    const r = parsePhotoCheck(
      JSON.stringify({ ...good, seen: { en: "  " + "x".repeat(300), ar: "اتصل 0555 12 34 56" } }),
    );
    expect(r?.seen.en).toHaveLength(160);
    expect(r?.seen.ar).toBe("اتصل •••");
  });

  test("anything that doesn't fit the shape is null", () => {
    expect(parsePhotoCheck("not json")).toBeNull();
    expect(parsePhotoCheck(JSON.stringify({ ...good, match: "maybe" }))).toBeNull();
    expect(parsePhotoCheck(JSON.stringify({ ...good, state: "rotten" }))).toBeNull();
    expect(parsePhotoCheck(JSON.stringify({ ...good, seen: { en: "x" } }))).toBeNull();
    expect(parsePhotoCheck(JSON.stringify({ ...good, tip: { en: "", ar: "" } }))).toBeNull();
    expect(parsePhotoCheck(JSON.stringify({ ...good, concerns: "mould" }))).toBeNull();
    expect(parsePhotoCheck("[]")).toBeNull();
  });
});

describe("photoCheckPrompt", () => {
  test("names the chosen residue in plain words, or the farmer's own words", () => {
    expect(photoCheckPrompt("pomegranate_peels", undefined)).toContain('"pomegranate peels"');
    expect(photoCheckPrompt("other", "fig leaves")).toContain('"fig leaves"');
  });
});

describe("utcDay", () => {
  test("the same number all day long (UTC)", () => {
    const d = Date.UTC(2026, 9, 6);
    expect(utcDay(d)).toBe(utcDay(d + 86_399_999));
    expect(utcDay(d + 86_400_000)).toBe(utcDay(d) + 1);
  });
});

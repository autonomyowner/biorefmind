import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "./ai";

// Every AI call goes to Anthropic's Messages API (Claude), through the official SDK.
// The platform used OpenRouter until 2026-10-19; the prompts, schemas and limits are unchanged.
// Never import this file from the schema (or anything the schema imports): the SDK can't load there.

/** USD per million tokens (input, output), for the admin's spend figures. Unknown models count as Haiku. */
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-haiku-4-5": [1, 5],
  "claude-sonnet-5-5": [2, 10],
  "claude-sonnet-5": [2, 10],
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
};

/** One client per call: `maxRetries: 0` because every caller already has its own retry and time budget. */
export function claude(key: string, timeoutMs: number): Anthropic {
  return new Anthropic({ apiKey: key, maxRetries: 0, timeout: timeoutMs });
}

/** What a call cost, from its token usage (cache writes at 1.25×, cache reads at 0.1× the input price). */
export function costOf(model: string, usage: Anthropic.Usage | undefined): number {
  if (!usage) return 0;
  const [inPrice, outPrice] = PRICES[model] ?? PRICES[DEFAULT_MODEL];
  const input = usage.input_tokens + 1.25 * (usage.cache_creation_input_tokens ?? 0) + 0.1 * (usage.cache_read_input_tokens ?? 0);
  // Rounded to a billionth of a dollar, so sums of small calls stay exact.
  return Math.round((input * inPrice + usage.output_tokens * outPrice) * 1000) / 1e9;
}

/** An image (or a PDF, as a document) from a `data:` URL or a public https URL. */
export function mediaBlock(url: string): Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam {
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(url);
  if (!m) return { type: "image", source: { type: "url", url } };
  const [, type, data] = m;
  if (type === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  return { type: "image", source: { type: "base64", media_type: type as Anthropic.Base64ImageSource["media_type"], data } };
}

/** The text of a response (all text blocks, joined). */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * One structured answer: Claude must reply with JSON matching `schema`. Returns the raw JSON text
 * (the caller's own parser checks and cleans it) and the cost, or throws on an API error.
 */
export async function askJson(opts: {
  key: string;
  model: string;
  system: string;
  content: Anthropic.ContentBlockParam[];
  schema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
  effort?: "low" | "medium" | "high";
}): Promise<{ text: string; costUsd: number }> {
  const message = await claude(opts.key, opts.timeoutMs).messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    output_config: { effort: opts.effort ?? "low", format: { type: "json_schema", schema: opts.schema } },
    messages: [{ role: "user", content: opts.content }],
  });
  const costUsd = costOf(opts.model, message.usage);
  if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return { text: "", costUsd };
  return { text: textOf(message), costUsd };
}

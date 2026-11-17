import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractKeywords } from "@/modules/keywords/core";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { resolveKeywords } from "./keyword-source";

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const ad = readFileSync("data/fixtures/example-nordic-digital/ad.txt", "utf8");

describe("AD-5 resolveKeywords", () => {
  it("gives the extracted Keywords with the source code", () => {
    const resolved = resolveKeywords(ad, { vocabulary });
    const extracted = extractKeywords(ad, vocabulary);
    if (!resolved.ok || !extracted.ok) throw new Error("expected Keywords");
    expect(resolved.value.keywordSource).toBe("code");
    expect(resolved.value.keywords).toEqual(extracted.value);
  });

  it("gives TOO_FEW_KEYWORDS for an ad with under 3 Keywords", () => {
    const resolved = resolveKeywords("Vi trenger en blid person. ".repeat(10), {
      vocabulary,
    });
    expect(resolved).toEqual({ ok: false, error: "TOO_FEW_KEYWORDS" });
  });
});

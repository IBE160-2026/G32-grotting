import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractKeywords,
  normalise,
  splitParagraphs,
} from "@/modules/keywords/core";
import { type AnswerKey, answerKeySchema } from "@/shared/core/answer-key";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { analysisResultSchema } from "../contracts";
import { analyse } from "./analyse";

// SM-2 (FR-5, FR-6, FR-7, NFR-6): on every Fixture the score and the Matched
// and Missing lists equal the Answer key.

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const root = join("data", "fixtures");
const ids = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name);

function read(id: string, file: string): string {
  return readFileSync(join(root, id, file), "utf8");
}

function run(id: string, cv = read(id, "cv.txt")) {
  const ad = read(id, "ad.txt");
  const extracted = extractKeywords(ad, vocabulary);
  if (!extracted.ok) throw new Error(`${id}: ${extracted.error}`);
  return analyse(cv, extracted.value, vocabulary, {
    keywordSource: "code",
    adParagraphs: splitParagraphs(ad).length,
  });
}

const lower = (words: string[]) => words.map(normalise);

// FR-5b (docs/qa/fr-5b-decision.md): code alone fails SM-2 on the held-out
// Fixture, so its score and lists test is pinned as an expected failure, as in
// `keywords/core/sm2.test.ts`. Remove the entry when the lists agree.
const expectedToFail = new Set(["held-out-regnskap-kvale"]);

describe("FR-7 analyse over the Fixtures", () => {
  it("has Fixtures to test", () => {
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  for (const id of ids) {
    const key: AnswerKey = answerKeySchema.parse(
      JSON.parse(read(id, "answer-key.json")),
    );

    const listTest = expectedToFail.has(id) ? it.fails : it;
    listTest(`gives the Answer key's score and lists for ${id}`, () => {
      const result = run(id);
      expect(result.score).toBe(key.score);
      expect(lower(result.matched.map((k) => k.term)).sort()).toEqual(
        lower(key.keywords.matched).sort(),
      );
      expect(lower(result.missing.map((k) => k.term)).sort()).toEqual(
        lower(key.keywords.missing).sort(),
      );
      expect(result.matchedCount).toBe(key.keywords.matched.length);
      expect(result.totalCount).toBe(
        key.keywords.matched.length + key.keywords.missing.length,
      );
    });

    it(`gives a result that fits its schema and a second run alike for ${id} (NFR-6)`, () => {
      const result = run(id);
      expect(analysisResultSchema.safeParse(result).success).toBe(true);
      expect(run(id)).toEqual(result);
    });
  }
});

describe("FR-7 analyse result", () => {
  const id = "example-nordic-digital";

  it("gives the formula key with the counts and the score", () => {
    const result = run(id);
    expect(result.formula).toEqual({
      key: "MATCH_FORMULA",
      params: {
        matched: result.matchedCount,
        total: result.totalCount,
        score: result.score,
      },
    });
    expect(result.keywordSource).toBe("code");
    expect(result.adParagraphs).toBe(
      splitParagraphs(read(id, "ad.txt")).length,
    );
  });

  it("carries the CV line as Evidence for each Matched keyword", () => {
    const cv = read(id, "cv.txt").replace(/\r\n?/g, "\n").split("\n");
    const result = run(id);
    for (const keyword of result.matched) {
      expect(keyword.evidence.text, keyword.term).toBe(
        cv[keyword.evidence.line - 1],
      );
      expect(keyword.positions.length, keyword.term).toBeGreaterThan(0);
    }
    const figma = result.matched.find((k) => k.term === "Figma");
    expect(figma?.evidence.text).toContain("Prototyping i Figma");
  });

  it("gives each Missing keyword an explanation key and no prose", () => {
    const result = run(id);
    for (const keyword of result.missing) {
      expect(keyword.explanation).toEqual({
        key: "MISSING_KEYWORD",
        params: { keyword: keyword.term },
      });
      expect(keyword.positions.length, keyword.term).toBeGreaterThan(0);
    }
  });

  it("keeps the order of the extracted Keywords in both lists", () => {
    const ad = read(id, "ad.txt");
    const extracted = extractKeywords(ad, vocabulary);
    if (!extracted.ok) throw new Error(extracted.error);
    const result = run(id);
    const order = extracted.value.map((k) => k.term);
    const indexes = (terms: string[]) => terms.map((t) => order.indexOf(t));
    for (const list of [result.matched, result.missing]) {
      const at = indexes(list.map((k) => k.term));
      expect(at).toEqual([...at].sort((a, b) => a - b));
    }
  });

  it("does not carry a Verdict", () => {
    expect(Object.keys(run(id))).not.toContain("verdict");
  });

  it("gives score 0 and all Missing, each explained, for a CV with none", () => {
    const cv = "Lang tekst uten noe relevant. ".repeat(10);
    const result = run(id, cv);
    expect(result.score).toBe(0);
    expect(result.matched).toEqual([]);
    expect(result.missing.length).toBe(result.totalCount);
    for (const keyword of result.missing) {
      expect(keyword.explanation.key).toBe("MISSING_KEYWORD");
    }
  });

  it("throws RangeError when there are no Keywords", () => {
    expect(() =>
      analyse("cv", [], vocabulary, { keywordSource: "code", adParagraphs: 1 }),
    ).toThrow(RangeError);
  });
});

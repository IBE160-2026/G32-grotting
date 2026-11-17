import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type AnswerKey, answerKeySchema } from "@/shared/core/answer-key";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { extractKeywords } from "./extract";
import { findKeyword } from "./find";
import { normalise } from "./normalise";

// SM-2 (FR-6, NFR-6): on every Fixture, extraction from the ad plus lookup in
// the CV gives exactly the Answer key's Matched and Missing lists. Only the
// Answer keys may justify a matching or vocabulary change.

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

function lists(id: string) {
  const extracted = extractKeywords(read(id, "ad.txt"), vocabulary);
  if (!extracted.ok) throw new Error(`${id}: ${extracted.error}`);
  const cv = read(id, "cv.txt");
  const matched: string[] = [];
  const missing: string[] = [];
  const hits = new Map<string, ReturnType<typeof findKeyword>>();
  for (const keyword of extracted.value) {
    const found = findKeyword(cv, keyword, vocabulary);
    hits.set(keyword.term, found);
    (found.length > 0 ? matched : missing).push(keyword.term);
  }
  return { matched, missing, hits };
}

function differences(
  id: string,
  list: "Matched" | "Missing",
  expected: string[],
  actual: string[],
): string[] {
  const want = new Set(expected.map(normalise));
  const got = new Set(actual.map(normalise));
  return [
    ...[...want]
      .filter((word) => !got.has(word))
      .map((word) => `${id}: «${word}» should be ${list} but is not`),
    ...[...got]
      .filter((word) => !want.has(word))
      .map(
        (word) => `${id}: «${word}» is ${list} but is not in the Answer key`,
      ),
  ];
}

describe("SM-2 Fixtures", () => {
  it("has Fixtures to test", () => {
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  for (const id of ids) {
    const key: AnswerKey = answerKeySchema.parse(
      JSON.parse(read(id, "answer-key.json")),
    );

    it(`gives the Answer key's Matched and Missing lists for ${id}`, () => {
      const { matched, missing } = lists(id);
      expect([
        ...differences(id, "Matched", key.keywords.matched, matched),
        ...differences(id, "Missing", key.keywords.missing, missing),
      ]).toEqual([]);
    });

    it(`matches none of the must-not-match terms in ${id}`, () => {
      const { matched, missing, hits } = lists(id);
      const problems: string[] = [];
      for (const { term } of key.mustNotMatch) {
        const word = normalise(term);
        if ([...matched, ...missing].some((kw) => normalise(kw) === word)) {
          problems.push(`${id}: «${term}» is a Keyword`);
        }
        for (const [keyword, found] of hits) {
          for (const hit of found) {
            const text = hit.text.slice(hit.start, hit.end);
            if (normalise(text) === word) {
              problems.push(`${id}: «${term}» matched «${keyword}»`);
            }
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it(`gives the Answer key's score for ${id}`, () => {
      const { matched, missing } = lists(id);
      const score = Math.round(
        (100 * matched.length) / (matched.length + missing.length),
      );
      expect(`${id}: ${score}`).toBe(`${id}: ${key.score}`);
    });

    it(`gives identical lists on a second run for ${id} (NFR-6)`, () => {
      expect(lists(id)).toEqual(lists(id));
    });

    it(`gives Evidence that reads as the CV line for every Matched Keyword in ${id}`, () => {
      const cv = read(id, "cv.txt").replace(/\r\n?/g, "\n").split("\n");
      const { hits } = lists(id);
      for (const [keyword, found] of hits) {
        for (const hit of found) {
          expect(hit.text, keyword).toBe(cv[hit.line - 1]);
          expect(hit.end, keyword).toBeGreaterThan(hit.start);
          expect(hit.end, keyword).toBeLessThanOrEqual(hit.text.length);
        }
      }
    });
  }
});

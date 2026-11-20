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

// FR-5b (decided 2026-11-17, docs/qa/fr-5b-decision.md): code alone fails SM-2
// on the held-out Fixture. The failure is expected and pinned here with
// `it.fails`, so it turns red when the lists start to agree (remove the entry
// then). The vocabulary is not changed to make it pass. Story 3.11 recorded the
// AI lists (`cached/keywords.json`); they do not equal the Answer keys either
// (see the table in the decision file), and this test is about the code-only
// engine, so the entry stays.
const expectedToFail = new Set(["held-out-regnskap-kvale"]);

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

    const listTest = expectedToFail.has(id) ? it.fails : it;
    listTest(
      `gives the Answer key's Matched and Missing lists for ${id}`,
      () => {
        const { matched, missing } = lists(id);
        expect([
          ...differences(id, "Matched", key.keywords.matched, matched),
          ...differences(id, "Missing", key.keywords.missing, missing),
        ]).toEqual([]);
      },
    );

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

    it(`gives identical lists on a second run for ${id} (NFR-6)`, () => {
      expect(lists(id)).toEqual(lists(id));
    });

    it(`gives Evidence that reads as the CV line for every Matched Keyword in ${id}`, () => {
      const cv = read(id, "cv.txt").replace(/\r\n?/g, "\n").split("\n");
      const { matched, hits } = lists(id);
      for (const keyword of matched) {
        expect(hits.get(keyword)?.length, keyword).toBeGreaterThan(0);
      }
      for (const [keyword, found] of hits) {
        for (const hit of found) {
          expect(hit.text, keyword).toBe(cv[hit.line - 1]);
          expect(hit.text.slice(hit.start, hit.end).trim(), keyword).not.toBe(
            "",
          );
          expect(hit.end, keyword).toBeGreaterThan(hit.start);
          expect(hit.end, keyword).toBeLessThanOrEqual(hit.text.length);
        }
      }
    });
  }
});

describe("SM-2 Evidence", () => {
  it("points at the CV line and word of a known Matched Keyword", () => {
    const cv = read("example-nordic-digital", "cv.txt");
    const [figma] = findKeyword(cv, { term: "Figma" }, vocabulary);
    const cvLines = cv.split(String.fromCharCode(10));
    expect(figma.line).toBe(cvLines.indexOf(figma.text) + 1);
    expect(figma.text).toContain("Prototyping i Figma");
    expect(figma.text.slice(figma.start, figma.end)).toBe("Figma");
    expect(figma.stage).toBe("exact");
  });
});

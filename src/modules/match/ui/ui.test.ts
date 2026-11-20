import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { extractKeywords, splitParagraphs } from "@/modules/keywords/core";
import { answerKeySchema } from "@/shared/core/answer-key";
import { vocabularySchema } from "@/shared/core/vocabulary";
import type { AnalysisResult } from "../contracts";
import { analyse } from "../core/analyse";
import {
  KeywordList,
  phaseOneLine,
  resultChanged,
  ScoreBlock,
  updatedLine,
} from "./index";

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const dir = "data/fixtures/example-nordic-digital";
const key = answerKeySchema.parse(
  JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")),
);
const ad = readFileSync(`${dir}/ad.txt`, "utf8");
const cv = readFileSync(`${dir}/cv.txt`, "utf8");
const adParagraphs = splitParagraphs(ad);
const extracted = extractKeywords(ad, vocabulary);
if (!extracted.ok) throw new Error(extracted.error);
const result = analyse(cv, extracted.value, vocabulary, {
  keywordSource: "code",
  adParagraphs: adParagraphs.length,
});

const text = (html: string) => html.replace(/<[^>]*>/g, "");

function withScore(score: number, matched: number, total: number) {
  return {
    ...result,
    score,
    matchedCount: matched,
    totalCount: total,
    formula: { key: "MATCH_FORMULA", params: { matched, total, score } },
  } as AnalysisResult;
}

function scoreHtml(value: AnalysisResult) {
  return renderToStaticMarkup(createElement(ScoreBlock, { result: value }));
}

describe("FR-7 score block", () => {
  it("shows the score sentence as an h2, the formula and the disclaimer", () => {
    const html = scoreHtml(result);
    const { matchedCount, totalCount, score } = result;
    expect(score).toBe(key.score);
    expect(html).toMatch(
      new RegExp(
        `<h2[^>]*>${score} % samsvar – ${matchedCount} av ${totalCount} nøkkelord</h2>`,
      ),
    );
    expect(html).toContain(">Formel<");
    expect(text(html)).toContain(
      `${matchedCount} av ${totalCount} nøkkelord funnet = ${score} %`,
    );
    expect(text(html)).toContain(
      "Et anslag på hvor mange av annonsens nøkkelord CV-en din dekker. Ikke en ekte ATS-vurdering, og ingen spådom om intervjusjanser.",
    );
  });

  it("says «Sterkt samsvar» from 70 and «Bør forbedres» at 69", () => {
    const strong = scoreHtml(withScore(70, 7, 10));
    expect(strong).toContain("Sterkt samsvar");
    expect(strong).toContain("bg-moss");
    expect(text(strong)).toContain("70 % eller mer gir «Sterkt samsvar».");
    const weak = scoreHtml(withScore(69, 69, 100));
    expect(weak).toContain("Bør forbedres");
    expect(weak).not.toContain("bg-moss");
    expect(weak).not.toContain("Sterkt samsvar");
    expect(text(weak)).toContain(
      "Under 70 % gir «Bør forbedres». Se hva som mangler nedenfor.",
    );
  });

  it("shows a score of 0 as «0 % samsvar – 0 av 7 nøkkelord»", () => {
    expect(text(scoreHtml(withScore(0, 0, 7)))).toContain(
      "0 % samsvar – 0 av 7 nøkkelord",
    );
  });

  it("FR-5b shows no less-precise line for code-only or saved Keywords", () => {
    expect(text(scoreHtml(result))).not.toContain("Mindre presist");
    expect(
      text(scoreHtml({ ...result, keywordSource: "saved" })),
    ).not.toContain("Mindre presist");
  });

  it("FR-5b shows «Mindre presist: nøkkelordene er hentet ut uten KI.» under the formula for code-fallback Keywords", () => {
    const html = scoreHtml({ ...result, keywordSource: "code-fallback" });
    expect(text(html)).toContain(
      "Mindre presist: nøkkelordene er hentet ut uten KI.",
    );
    expect(html.indexOf("Mindre presist")).toBeGreaterThan(
      html.indexOf(" av ") + 1,
    );
    expect(html.indexOf("Mindre presist")).toBeGreaterThan(
      html.indexOf("Et anslag"),
    );
  });
});

describe("FR-7 phase-1 live line", () => {
  it("says the score sentence and the Verdict once, without the AI sentence", () => {
    expect(phaseOneLine(withScore(71, 5, 7))).toBe(
      "Samsvaret er klart: 71 %, sterkt samsvar, 5 av 7 nøkkelord.",
    );
    expect(phaseOneLine(withScore(57, 4, 7))).toBe(
      "Samsvaret er klart: 57 %, bør forbedres, 4 av 7 nøkkelord.",
    );
  });

  it("FR-9 ends with the AI sentence of the before-S4 variant when the Letter is next", () => {
    expect(phaseOneLine(withScore(71, 5, 7), true)).toBe(
      "Samsvaret er klart: 71 %, sterkt samsvar, 5 av 7 nøkkelord. Søknadsbrevet skrives nå.",
    );
  });
});

describe("AD-6 the line for a result that a silent rerun changed", () => {
  it("says the new score and Verdict as an update", () => {
    expect(updatedLine(withScore(57, 4, 7))).toBe(
      "Samsvaret er oppdatert: 57 %, bør forbedres, 4 av 7 nøkkelord.",
    );
  });

  it("sees a changed score, a changed count or a changed keyword list, and nothing else", () => {
    expect(resultChanged(result, { ...result })).toBe(false);
    expect(resultChanged(result, withScore(57, 4, 7))).toBe(true);
    expect(
      resultChanged(result, {
        ...result,
        matched: result.matched.slice(1),
      }),
    ).toBe(true);
    expect(
      resultChanged(result, {
        ...result,
        missing: [...result.missing].reverse().concat(result.missing),
      }),
    ).toBe(true);
    // Evidence and positions alone are not something the Student reads as a change.
    expect(
      resultChanged(result, {
        ...result,
        adParagraphs: result.adParagraphs + 1,
      }),
    ).toBe(false);
  });
});

describe("FR-8 keyword lists", () => {
  const found = renderToStaticMarkup(
    createElement(KeywordList, {
      kind: "matched",
      entries: result.matched,
      adParagraphs,
    }),
  );
  const missing = renderToStaticMarkup(
    createElement(KeywordList, {
      kind: "missing",
      entries: result.missing,
      adParagraphs,
    }),
  );

  it("equal the Answer key in size and show one h3 per Keyword", () => {
    expect(result.matched).toHaveLength(key.keywords.matched.length);
    expect(result.missing).toHaveLength(key.keywords.missing.length);
    expect(found.match(/<h3/g)).toHaveLength(key.keywords.matched.length);
    expect(missing.match(/<h3/g)).toHaveLength(key.keywords.missing.length);
    expect(found).toContain(">Funnet i CV-en</h2>");
    expect(missing).toContain(">Mangler i CV-en</h2>");
  });

  it("puts the strip inside each h3 and builds the source lines", () => {
    expect(found).toMatch(/<h3[^>]*>[^<]*<span[^>]*>Funnet<\/span><\/h3>/);
    expect(missing).toMatch(/<h3[^>]*>[^<]*<span[^>]*>Mangler<\/span><\/h3>/);
    for (const entry of result.matched) {
      const number = String(entry.positions[0].paragraph + 1).padStart(2, "0");
      expect(text(found)).toContain(
        `Bevis · CV-linje ${entry.evidence.line} · annonsen avsnitt ${number}`,
      );
      const marked = entry.evidence.text.slice(
        entry.evidence.start,
        entry.evidence.end,
      );
      expect(found).toContain(`>${marked}</mark>`);
    }
    for (const entry of result.missing) {
      const number = String(entry.positions[0].paragraph + 1).padStart(2, "0");
      expect(text(missing)).toContain(`Fra annonsen · avsnitt ${number}`);
      expect(text(missing)).toContain(
        `Annonsen ber om «${entry.term}». CV-en din viser det ikke ennå.`,
      );
    }
  });

  it("quotes the ad paragraph at the first position of the Keyword", () => {
    const first = result.missing[0];
    const [position] = first.positions;
    const line = adParagraphs[position.paragraph];
    const word = line.slice(position.start, position.end);
    expect(missing).toContain(`>${word}</mark>`);
    expect(text(missing)).toContain(line.slice(0, 20));
  });

  it("shows no h2 for an empty list", () => {
    expect(
      renderToStaticMarkup(
        createElement(KeywordList, {
          kind: "matched",
          entries: [],
          adParagraphs,
        }),
      ),
    ).toBe("");
  });
});

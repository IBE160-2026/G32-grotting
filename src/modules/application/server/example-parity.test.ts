import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractCvText } from "@/modules/cv";
import { normalise } from "@/modules/keywords/core";
import { answerKeySchema } from "@/shared/core/answer-key";
import { canon } from "@/shared/core/canon";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { loadExamplePair } from "@/shared/server/data-files";
import { normaliseNewlines } from "../contracts";
import { analyseInputs } from "./analyse";

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const dir = "data/fixtures/example-nordic-digital";
const answerKey = answerKeySchema.parse(
  JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")),
);
const sorted = (terms: string[]) => terms.map(normalise).sort();

// The CV text of one file, as the upload route hands it to the form.
async function fileCvText(name: string): Promise<string> {
  const extracted = await extractCvText(
    name,
    new Uint8Array(readFileSync(`${dir}/${name}`)),
  );
  if (!extracted.ok) throw new Error(`could not read ${name}`);
  return normaliseNewlines(extracted.value.text);
}

describe("FR-27, FR-3 the three CV routes of the Example pair agree", () => {
  it("gives equal canon text, score, lists and fingerprint for cv.pdf, cv.txt and «Bruk eksempelet»", async () => {
    const pair = await loadExamplePair();
    const base = {
      jobAd: normaliseNewlines(pair.jobAd),
      jobTitle: pair.jobTitle,
      employer: pair.employer,
    };
    const routes = {
      pdf: await fileCvText("cv.pdf"),
      txt: await fileCvText("cv.txt"),
      example: normaliseNewlines(pair.cvText),
    };

    const analysed = Object.fromEntries(
      Object.entries(routes).map(([route, cvText]) => {
        const done = analyseInputs({ ...base, cvText }, vocabulary);
        if (!done.ok) throw new Error(`${route}: ${done.error}`);
        return [route, done.value] as const;
      }),
    );

    // The routes could all degrade together: the Answer key anchors them.
    const { result } = analysed.pdf;
    expect(result.score).toBe(answerKey.score);
    expect(sorted(result.matched.map(({ term }) => term))).toEqual(
      sorted(answerKey.keywords.matched),
    );
    expect(sorted(result.missing.map(({ term }) => term))).toEqual(
      sorted(answerKey.keywords.missing),
    );

    expect(canon(routes.txt)).toBe(canon(routes.pdf));
    expect(canon(routes.example)).toBe(canon(routes.pdf));
    for (const route of ["txt", "example"]) {
      expect(analysed[route].result.score).toBe(analysed.pdf.result.score);
      expect(analysed[route].result.matched.map(({ term }) => term)).toEqual(
        analysed.pdf.result.matched.map(({ term }) => term),
      );
      expect(analysed[route].result.missing.map(({ term }) => term)).toEqual(
        analysed.pdf.result.missing.map(({ term }) => term),
      );
      expect(analysed[route].fingerprint).toBe(analysed.pdf.fingerprint);
    }
  });
});

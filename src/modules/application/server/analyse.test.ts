import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalise, splitParagraphs } from "@/modules/keywords/core";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { analyseResponseSchema } from "../contracts";
import { fingerprintOf } from "../core/fingerprint";
import { analyseExample, analyseInputs } from "./analyse";

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const answerKey = JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8"));
const inputs = {
  cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${dir}/ad.txt`, "utf8"),
  jobTitle: meta.jobTitle as string,
  employer: meta.employer as string,
};

describe("phase 1 analyseInputs", () => {
  it("gives a result and a fingerprint that fit the response schema", () => {
    const analysed = analyseInputs(inputs, vocabulary);
    if (!analysed.ok) throw new Error(analysed.error);
    expect(analyseResponseSchema.safeParse(analysed.value).success).toBe(true);
    expect(analysed.value.result.score).toBe(answerKey.score);
    expect(analysed.value.result.keywordSource).toBe("code");
  });

  it("gives identical output twice and another fingerprint for another title", () => {
    const first = analyseInputs(inputs, vocabulary);
    const second = analyseInputs(inputs, vocabulary);
    const other = analyseInputs({ ...inputs, jobTitle: "Annen" }, vocabulary);
    if (!first.ok || !second.ok || !other.ok) throw new Error("expected ok");
    expect(second).toEqual(first);
    expect(other.value.result).toEqual(first.value.result);
    expect(other.value.fingerprint).not.toBe(first.value.fingerprint);
  });

  it("counts the paragraphs of the ad, not of the CV", () => {
    const analysed = analyseInputs(inputs, vocabulary);
    if (!analysed.ok) throw new Error(analysed.error);
    const paragraphs = splitParagraphs(inputs.jobAd).length;
    expect(analysed.value.result.adParagraphs).toBe(paragraphs);
    expect(paragraphs).not.toBe(splitParagraphs(inputs.cvText).length);
  });

  it("puts the vocabulary version and Keyword source into the fingerprint", () => {
    const analysed = analyseInputs(inputs, vocabulary);
    const newer = analyseInputs(inputs, {
      ...vocabulary,
      vocabularyVersion: "v1-89abcdef",
    });
    if (!analysed.ok || !newer.ok) throw new Error("expected ok");
    expect(analysed.value.fingerprint).toBe(
      fingerprintOf(inputs, vocabulary.vocabularyVersion, "code"),
    );
    expect(newer.value.result).toEqual(analysed.value.result);
    expect(newer.value.fingerprint).not.toBe(analysed.value.fingerprint);
  });

  it("gives TOO_FEW_KEYWORDS when the ad has under 3 Keywords", () => {
    const jobAd = "Vi trenger en blid person. ".repeat(10);
    expect(analyseInputs({ ...inputs, jobAd }, vocabulary)).toEqual({
      ok: false,
      error: "TOO_FEW_KEYWORDS",
    });
  });
});

describe("FR-8 analyseExample for the Hjem plot", () => {
  it("gives the ad's paragraphs and the Matched and Missing terms of the Example pair", async () => {
    const example = await analyseExample();
    const analysed = analyseInputs(inputs, vocabulary);
    if (!analysed.ok) throw new Error(analysed.error);
    const { matched, missing } = analysed.value.result;
    expect(example.paragraphs).toEqual(splitParagraphs(inputs.jobAd));
    expect(example.matched).toEqual(
      matched.map(({ term, positions }) => ({ term, positions })),
    );
    expect(example.missing).toEqual(
      missing.map(({ term, positions }) => ({ term, positions })),
    );
  });

  it("lists the same terms as the Answer key", async () => {
    const example = await analyseExample();
    const norm = (terms: string[]) => terms.map(normalise).sort();
    expect(norm(example.matched.map((k) => k.term))).toEqual(
      norm(answerKey.keywords.matched),
    );
    expect(norm(example.missing.map((k) => k.term))).toEqual(
      norm(answerKey.keywords.missing),
    );
  });

  it("is plain data: it survives a JSON round trip", async () => {
    const example = await analyseExample();
    expect(JSON.parse(JSON.stringify(example))).toEqual(example);
  });
});

import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  normalise,
  proposeKeywords,
  splitParagraphs,
} from "@/modules/keywords/core";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { getDb } from "@/shared/server/db";
import { analyseResponseSchema } from "../contracts";
import { fingerprintOf } from "../core/fingerprint";
import { analyseExample, analyseInputs } from "./analyse";

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const answerKey = JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8"));
const cached = JSON.parse(
  readFileSync(`${dir}/cached/keywords.json`, "utf8"),
) as { data: { keywords: string[] } };
const inputs = {
  cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${dir}/ad.txt`, "utf8"),
  jobTitle: meta.jobTitle as string,
  employer: meta.employer as string,
};

const CODE_ONLY = { keywordFallback: false };
// Test mode (a test run): the Cached Keyword list answers, no notice needed.
const ASK_AI = { ai: { ctx: { studentId: null, consent: null } } };

// Each test starts with no saved list.
beforeEach(async () => {
  await (await getDb()).execute(sql`delete from keyword_lists`);
});

describe("phase 1 analyseInputs with code-only Keywords", () => {
  it("gives a result and a fingerprint that fit the response schema", async () => {
    const analysed = await analyseInputs(inputs, vocabulary, CODE_ONLY);
    if (!analysed.ok) throw new Error(analysed.error);
    expect(analyseResponseSchema.safeParse(analysed.value).success).toBe(true);
    expect(analysed.value.result.score).toBe(answerKey.score);
    expect(analysed.value.result.keywordSource).toBe("code");
  });

  it("gives identical output twice and another fingerprint for another title", async () => {
    const first = await analyseInputs(inputs, vocabulary, CODE_ONLY);
    const second = await analyseInputs(inputs, vocabulary, CODE_ONLY);
    const other = await analyseInputs(
      { ...inputs, jobTitle: "Annen" },
      vocabulary,
      CODE_ONLY,
    );
    if (!first.ok || !second.ok || !other.ok) throw new Error("expected ok");
    expect(second).toEqual(first);
    expect(other.value.result).toEqual(first.value.result);
    expect(other.value.fingerprint).not.toBe(first.value.fingerprint);
  });

  it("counts the paragraphs of the ad, not of the CV", async () => {
    const analysed = await analyseInputs(inputs, vocabulary, CODE_ONLY);
    if (!analysed.ok) throw new Error(analysed.error);
    const paragraphs = splitParagraphs(inputs.jobAd).length;
    expect(analysed.value.result.adParagraphs).toBe(paragraphs);
    expect(paragraphs).not.toBe(splitParagraphs(inputs.cvText).length);
  });

  it("puts the vocabulary version and Keyword source into the fingerprint", async () => {
    const analysed = await analyseInputs(inputs, vocabulary, CODE_ONLY);
    const newer = await analyseInputs(
      inputs,
      { ...vocabulary, vocabularyVersion: "v1-89abcdef" },
      CODE_ONLY,
    );
    if (!analysed.ok || !newer.ok) throw new Error("expected ok");
    expect(analysed.value.fingerprint).toBe(
      fingerprintOf(inputs, vocabulary.vocabularyVersion, "code"),
    );
    expect(newer.value.result).toEqual(analysed.value.result);
    expect(newer.value.fingerprint).not.toBe(analysed.value.fingerprint);
  });

  it("gives TOO_FEW_KEYWORDS when the ad has under 3 Keywords", async () => {
    const jobAd = "Vi trenger en blid person. ".repeat(10);
    expect(
      await analyseInputs({ ...inputs, jobAd }, vocabulary, CODE_ONLY),
    ).toEqual({ ok: false, error: "TOO_FEW_KEYWORDS" });
  });
});

describe("FR-5b phase 1 analyseInputs with the Keyword fallback on", () => {
  it("scores the Example pair on its Cached Keyword list in Test mode, as `saved`", async () => {
    const analysed = await analyseInputs(inputs, vocabulary, ASK_AI);
    if (!analysed.ok) throw new Error(analysed.error);
    const { result } = analysed.value;
    expect(result.keywordSource).toBe("saved");
    const list = proposeKeywords(
      inputs.jobAd,
      cached.data.keywords,
      vocabulary,
    );
    expect(
      [...result.matched, ...result.missing].map((k) => k.term).sort(),
    ).toEqual(list.map((k) => k.term).sort());
    expect(analysed.value.fingerprint).toBe(
      fingerprintOf(inputs, vocabulary.vocabularyVersion, "saved"),
    );
  });

  it("NFR-6 gives the same list, score and fingerprint on a second run and for phase 2", async () => {
    const first = await analyseInputs(inputs, vocabulary, ASK_AI);
    const second = await analyseInputs(inputs, vocabulary, ASK_AI);
    // Phase 2 asks no AI: it reads the list phase 1 saved.
    const phaseTwo = await analyseInputs(inputs, vocabulary);
    expect(second).toEqual(first);
    expect(phaseTwo).toEqual(first);
  });

  it("uses the code list, marked `code-fallback`, for an ad with no saved list when no AI is asked", async () => {
    const analysed = await analyseInputs(inputs, vocabulary);
    if (!analysed.ok) throw new Error(analysed.error);
    expect(analysed.value.result.keywordSource).toBe("code-fallback");
    expect(analysed.value.fingerprint).toBe(
      fingerprintOf(inputs, vocabulary.vocabularyVersion, "code-fallback"),
    );
  });

  it("uses the code list, marked `code-fallback`, for a Test-mode ad that is not a Fixture", async () => {
    const jobAd = `${inputs.jobAd}\n\nOg litt til som ingen har spilt inn.`;
    const analysed = await analyseInputs(
      { ...inputs, jobAd },
      vocabulary,
      ASK_AI,
    );
    if (!analysed.ok) throw new Error(analysed.error);
    expect(analysed.value.result.keywordSource).toBe("code-fallback");
  });
});

describe("FR-8 analyseExample for the Hjem plot", () => {
  it("gives the ad's paragraphs and the Matched and Missing terms of the Example pair, as phase 1 shows them in Test mode", async () => {
    const example = await analyseExample();
    const analysed = await analyseInputs(inputs, vocabulary, ASK_AI);
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

  it("lists the Cached Keyword list of the Example pair, split into Matched and Missing", async () => {
    const example = await analyseExample();
    const norm = (terms: string[]) => terms.map(normalise).sort();
    const list = proposeKeywords(
      inputs.jobAd,
      cached.data.keywords,
      vocabulary,
    );
    expect(
      norm([...example.matched, ...example.missing].map((k) => k.term)),
    ).toEqual(norm(list.map((k) => k.term)));
  });

  it("is plain data: it survives a JSON round trip", async () => {
    const example = await analyseExample();
    expect(JSON.parse(JSON.stringify(example))).toEqual(example);
  });
});

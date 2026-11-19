import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { aiResultMetaSchema } from "@/modules/ai/contracts";
import { analyseInputs } from "@/modules/application";
import { normaliseNewlines } from "@/modules/application/contracts";
import { extractCvText } from "@/modules/cv";
import {
  checkTone,
  countWords,
  DIREKTE_MAX_WORDS,
} from "@/modules/integrity/core";
import {
  type CachedLetterFile,
  loadExamplePair,
  loadFixtures,
  loadVocabulary,
} from "@/shared/server/data-files";
import { SIGNATURE_TOKEN, TONES, type Tone } from "../contracts";
import { normaliseLetter } from "../core/normalise-letter";
import { generateLetter } from "./generate";
import { PROMPT_VERSION } from "./prompts/letter";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

// The Cached Letters of the Example pair (FR-27, SM-1, AD-15): recorded by
// `scripts/record-cached.ts` from a live run, read here only through
// `data-files.ts`, and judged by the rules the Letter has to follow.
const EXAMPLE_ID = "example-nordic-digital";
const CTX = { studentId: null, consent: null };
const MIN_WORDS = 250;
const MAX_WORDS = 400;
// «Med vennlig hilsen», «Hilsen», «Mvh» ...: what `normaliseLetter` accepts.
const CLOSING = /^(med\s+)?(vennlig|vennleg|høflig|beste)?\s*hilsen|^mvh/i;

async function exampleFixture() {
  const fixture = (await loadFixtures()).find(
    (candidate) => candidate.id === EXAMPLE_ID,
  );
  if (fixture === undefined) throw new Error("the Example pair must exist");
  return fixture;
}

function recorded(files: readonly CachedLetterFile[], tone: Tone) {
  const file = files.find((candidate) => candidate.tone === tone);
  if (file === undefined) throw new Error(`no Cached Letter for ${tone}`);
  const content = file.content as { data: { text: string }; meta: unknown };
  return {
    text: content.data.text,
    meta: aiResultMetaSchema.parse(content.meta),
  };
}

async function matchedTermsOf(inputs: {
  cvText: string;
  jobAd: string;
  jobTitle: string;
  employer: string;
}) {
  const analysed = analyseInputs(inputs, await loadVocabulary());
  if (!analysed.ok) throw new Error("the Example pair must analyse");
  return analysed.value.result.matched.map(({ term }) => term);
}

describe("FR-27, FR-10 the Example pair has one Cached Letter per Tone", () => {
  it("holds exactly the three Tones", async () => {
    const { cachedLetters } = await exampleFixture();
    expect(cachedLetters.map(({ tone }) => tone)).toEqual([...TONES]);
  });

  it.each(TONES)(
    "%s: the file is a raw AI output labelled as recorded live",
    async (tone) => {
      const { cachedLetters } = await exampleFixture();
      const { text, meta } = recorded(cachedLetters, tone);
      expect(typeof text).toBe("string");
      expect(meta.source).toBe("live");
      expect(meta.provider).not.toBe("mock");
      expect(meta.model).not.toBe("");
      expect(Number.isNaN(Date.parse(meta.createdAt))).toBe(false);
    },
  );
});

describe("AD-15 CI check: the Cached Letters belong to the current prompt", () => {
  it.each(TONES)("%s: promptVersion equals PROMPT_VERSION", async (tone) => {
    const { cachedLetters } = await exampleFixture();
    // Fails when the prompt wording moved on: record again with
    // `npm run fixtures:record -- example-nordic-digital`.
    expect(recorded(cachedLetters, tone).meta.promptVersion).toBe(
      PROMPT_VERSION,
    );
  });
});

describe("FR-9, FR-10, FR-12 every Cached Letter follows the rules", () => {
  it.each(TONES)(
    "%s: the raw text is shaped as the prompt asks",
    async (tone) => {
      const { cachedLetters } = await exampleFixture();
      const raw = recorded(cachedLetters, tone).text;
      const lines = raw.trim().split("\n");
      expect(raw.split(SIGNATURE_TOKEN)).toHaveLength(2);
      // The token ends the text, alone on its line, after a closing phrase.
      expect(lines.at(-1)?.trim()).toBe(SIGNATURE_TOKEN);
      const closing = lines
        .slice(0, -1)
        .reverse()
        .find((line) => line.trim() !== "");
      expect(closing?.trim()).toMatch(CLOSING);
    },
  );

  it.each(TONES)(
    "%s: exactly one token after normaliseLetter, 250-400 words",
    async (tone) => {
      const { cachedLetters } = await exampleFixture();
      const normalised = normaliseLetter(recorded(cachedLetters, tone).text);
      if (normalised === null) throw new Error("the Letter must not be blank");
      expect(normalised.split(SIGNATURE_TOKEN)).toHaveLength(2);
      const words = countWords(normalised);
      expect(words).toBeGreaterThanOrEqual(MIN_WORDS);
      expect(words).toBeLessThanOrEqual(MAX_WORDS);
      if (tone === "Direkte") {
        expect(words).toBeLessThanOrEqual(DIREKTE_MAX_WORDS);
      }
    },
  );

  it.each(TONES)(
    "%s: checkTone is ok with the Matched keywords",
    async (tone) => {
      const [fixture, pair] = await Promise.all([
        exampleFixture(),
        loadExamplePair(),
      ]);
      const check = checkTone(
        recorded(fixture.cachedLetters, tone).text,
        tone,
        await matchedTermsOf(pair),
      );
      expect(check).toEqual({ ok: true, problems: [] });
    },
  );
});

describe("FR-27 the three routes to the Example pair reach the same Cached Letter", () => {
  async function inputsByRoute() {
    const [fixture, pair] = await Promise.all([
      exampleFixture(),
      loadExamplePair(),
    ]);
    if (fixture.cvPdf === undefined) throw new Error("cv.pdf must exist");
    const pdf = await extractCvText("cv.pdf", fixture.cvPdf);
    const txt = await extractCvText("cv.txt", Buffer.from(fixture.cvText));
    if (!pdf.ok || !txt.ok) throw new Error("the CV files must be readable");
    const base = {
      jobAd: normaliseNewlines(pair.jobAd),
      jobTitle: pair.jobTitle,
      employer: pair.employer,
    };
    return {
      pair,
      routes: {
        pdf: { ...base, cvText: normaliseNewlines(pdf.value.text) },
        txt: { ...base, cvText: normaliseNewlines(txt.value.text) },
        example: { ...base, cvText: normaliseNewlines(pair.cvText) },
      },
    };
  }

  it.each(TONES)(
    "%s: cv.pdf, cv.txt and «Bruk eksempelet» give the recorded text, labelled cached",
    async (tone) => {
      const [fixture, { pair, routes }] = await Promise.all([
        exampleFixture(),
        inputsByRoute(),
      ]);
      const expected = normaliseLetter(
        recorded(fixture.cachedLetters, tone).text,
      );
      const matchedTerms = await matchedTermsOf(pair);

      for (const inputs of Object.values(routes)) {
        const result = await generateLetter(
          { inputs, tone, matchedTerms, previousRev: 0 },
          CTX,
          { testMode: true },
        );
        if (!result.ok)
          throw new Error(`expected ok, got ${result.error.code}`);
        expect(result.value.letter).toEqual({ text: expected, tone, rev: 1 });
        expect(result.value.meta.source).toBe("cached");
        expect(result.value.meta.promptVersion).toBe(PROMPT_VERSION);
      }
    },
  );

  it("shows the same Letter again for «Lag nytt utkast»", async () => {
    const { pair, routes } = await inputsByRoute();
    const matchedTerms = await matchedTermsOf(pair);
    const ask = (previousRev: number) =>
      generateLetter(
        { inputs: routes.example, tone: "Formell", matchedTerms, previousRev },
        CTX,
        { testMode: true },
      );
    const first = await ask(0);
    const second = await ask(1);
    if (!first.ok || !second.ok) throw new Error("expected ok");
    expect(second.value.letter.text).toBe(first.value.letter.text);
    expect(second.value.letter.rev).toBe(2);
  });
});

describe("FR-27 any other input says Test mode cannot answer it", () => {
  const unavailable = {
    ok: false,
    error: { code: "TEST_MODE_UNAVAILABLE", retryable: false },
  };

  async function ask(
    change: (pair: Awaited<ReturnType<typeof loadExamplePair>>) => {
      cvText?: string;
      jobAd?: string;
      jobTitle?: string;
      employer?: string;
    },
    tone: Tone = "Formell",
  ) {
    const pair = await loadExamplePair();
    return generateLetter(
      {
        inputs: { ...pair, ...change(pair) },
        tone,
        matchedTerms: await matchedTermsOf(pair),
        previousRev: 0,
      },
      CTX,
      { testMode: true },
    );
  }

  it("is not answered for an edited CV", async () => {
    expect(
      await ask((pair) => ({ cvText: `${pair.cvText}\nTypeScript` })),
    ).toEqual(unavailable);
  });

  it("is not answered for another ad", async () => {
    expect(
      await ask((pair) => ({ jobAd: `${pair.jobAd}\nOgså Rust.` })),
    ).toEqual(unavailable);
  });

  it("is not answered for another job title or employer", async () => {
    expect(await ask(() => ({ jobTitle: "Senior frontendutvikler" }))).toEqual(
      unavailable,
    );
    expect(await ask(() => ({ employer: "Fjord Analytics" }))).toEqual(
      unavailable,
    );
  });

  it("is not answered for a Tone that was not recorded", async () => {
    expect(await ask(() => ({}), "Humoristisk" as Tone)).toEqual(unavailable);
  });

  it("is not answered for another Fixture's own pair", async () => {
    // A Fixture without Cached Letters is not loaded, so read its files directly.
    const folder = "data/fixtures/nursing-sarvurdering";
    const meta = JSON.parse(await readFile(`${folder}/meta.json`, "utf8")) as {
      jobTitle: string;
      employer: string;
    };
    const other = {
      cvText: await readFile(`${folder}/cv.txt`, "utf8"),
      jobAd: await readFile(`${folder}/ad.txt`, "utf8"),
      ...meta,
    };
    const result = await generateLetter(
      {
        inputs: {
          cvText: other.cvText,
          jobAd: other.jobAd,
          jobTitle: other.jobTitle,
          employer: other.employer,
        },
        tone: "Formell",
        matchedTerms: [],
        previousRev: 0,
      },
      CTX,
      { testMode: true },
    );
    expect(result).toEqual(unavailable);
  });
});

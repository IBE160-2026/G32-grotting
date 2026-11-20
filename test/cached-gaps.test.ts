import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aiResultMetaSchema } from "@/modules/ai/contracts";
import { lookupKeyOf } from "@/modules/ai/core/lookup-key";
import { stripContactDetails } from "@/modules/ai/core/strip-contact";
import {
  CachedMissError,
  createCachedAdapter,
} from "@/modules/ai/server/adapters/cached";
import { analyseGaps } from "@/modules/gaps/server/analyse";
import {
  gapsOutputSchema,
  PROMPT_VERSION,
} from "@/modules/gaps/server/prompts/gaps";
import { checkCitation } from "@/modules/integrity/core";
import { normalise } from "@/modules/keywords/core";
import { answerKeySchema } from "@/shared/core/answer-key";
import { type FixtureFiles, loadFixtures } from "@/shared/server/data-files";
import { evaluateGaps } from "../scripts/qa-compare";

// FR-13, FR-15, FR-27, FR-28, SC4, AD-15 (Story 4.3): every Fixture has the
// Gaps a live request returned once (`scripts/record-cached.ts --gaps`), raw
// and unedited. These tests judge those recordings after the guards, as the
// Student would see them. They never edit a recording, an Answer key or the
// prompt to pass.

const EXAMPLE = "example-nordic-digital";
const IDS = [
  EXAMPLE,
  "held-out-regnskap-kvale",
  "nursing-sarvurdering",
  "two-column-fjord-analytics",
];

const answerKeyOf = (id: string) =>
  answerKeySchema.parse(
    JSON.parse(readFileSync(`data/fixtures/${id}/answer-key.json`, "utf8")),
  );

const rawOf = (fixture: FixtureFiles) =>
  fixture.cachedGaps?.content as { data: unknown; meta: unknown };

const CTX = { studentId: null, consent: null };

// Test mode, answered from the real `cached/` folders.
async function analyseCached(fixture: FixtureFiles, jobAd = fixture.jobAd) {
  const answerKey = answerKeyOf(fixture.id);
  return analyseGaps(
    {
      inputs: {
        cvText: fixture.cvText,
        jobAd,
        jobTitle: fixture.jobTitle,
        employer: fixture.employer,
      },
      missingTerms: answerKey.keywords.missing,
    },
    CTX,
    { adapter: createCachedAdapter(), testMode: true },
  );
}

describe("FR-27 every Fixture has Cached Gaps", () => {
  it("covers all four Fixtures, and not _planted", async () => {
    const fixtures = await loadFixtures();
    expect(fixtures.map(({ id }) => id)).toEqual(IDS);
    for (const fixture of fixtures) {
      expect(fixture.cachedGaps?.file, fixture.id).toBe("gaps.json");
    }
  });

  it("is a raw AiOutput labelled with provider, model, prompt version and date", async () => {
    for (const fixture of await loadFixtures()) {
      const content = rawOf(fixture);
      expect(Object.keys(content).sort(), fixture.id).toEqual(["data", "meta"]);
      const meta = aiResultMetaSchema.parse(content.meta);
      expect(meta.source, fixture.id).toBe("live");
      expect(meta.provider, fixture.id).not.toBe("cached");
      expect(meta.model.length, fixture.id).toBeGreaterThan(0);
      expect(meta.promptVersion, fixture.id).toMatch(/^gaps-\d+$/);
      expect(Number.isNaN(Date.parse(meta.createdAt)), fixture.id).toBe(false);
      expect(gapsOutputSchema.safeParse(content.data).success, fixture.id).toBe(
        true,
      );
    }
  });

  it("AD-15 CI check: the Example pair's cached gaps promptVersion is the current PROMPT_VERSION", async () => {
    const example = (await loadFixtures()).find(({ id }) => id === EXAMPLE);
    if (example === undefined) throw new Error("no Example pair");
    const meta = aiResultMetaSchema.parse(rawOf(example).meta);
    expect(meta.promptVersion).toBe(PROMPT_VERSION);
  });

  it("was recorded with the same prompt version for every Fixture", async () => {
    const versions = (await loadFixtures()).map(
      (fixture) => aiResultMetaSchema.parse(rawOf(fixture).meta).promptVersion,
    );
    expect(new Set(versions).size).toBe(1);
  });
});

describe("FR-27 Test mode answers a Gaps request from gaps.json by the Gaps key", () => {
  it.each(IDS)(
    "%s: by the CV text and the ad, not by title, employer or Tone",
    async (id) => {
      const fixture = (await loadFixtures()).find((f) => f.id === id);
      if (fixture === undefined) throw new Error(`no Fixture ${id}`);
      const adapter = createCachedAdapter();
      const generated = await adapter.generate({
        task: "gaps",
        prompt: "ignored",
        lookupKey: lookupKeyOf({
          task: "gaps",
          cvText: fixture.cvText,
          jobAd: fixture.jobAd,
        }),
        signal: new AbortController().signal,
        maxRetries: 0,
        schema: gapsOutputSchema,
      });
      expect(generated.output).toEqual(rawOf(fixture).data);
    },
  );

  it.each(IDS)("%s: any other input is TEST_MODE_UNAVAILABLE", async (id) => {
    const fixture = (await loadFixtures()).find((f) => f.id === id);
    if (fixture === undefined) throw new Error(`no Fixture ${id}`);
    const other = await analyseCached(
      fixture,
      `${fixture.jobAd}\nEn linje til.`,
    );
    expect(other.ok).toBe(false);
    if (!other.ok) {
      expect(other.error).toEqual({
        code: "TEST_MODE_UNAVAILABLE",
        retryable: false,
      });
    }
    // Nor is a request for another CV.
    await expect(
      createCachedAdapter().generate({
        task: "gaps",
        prompt: "ignored",
        lookupKey: lookupKeyOf({
          task: "gaps",
          cvText: `${fixture.cvText}\nEn ekstra linje.`,
          jobAd: fixture.jobAd,
        }),
        signal: new AbortController().signal,
        maxRetries: 0,
        schema: gapsOutputSchema,
      }),
    ).rejects.toBeInstanceOf(CachedMissError);
  });
});

describe("FR-13, FR-15, FR-28 the Cached Gaps after the guards", () => {
  it.each(IDS)(
    "%s: exactly one Gap per Missing keyword, in the Answer key's order",
    async (id) => {
      const fixture = (await loadFixtures()).find((f) => f.id === id);
      if (fixture === undefined) throw new Error(`no Fixture ${id}`);
      const result = await analyseCached(fixture);
      if (!result.ok) throw new Error(`expected ok for ${id}`);
      expect(result.value.gaps.map((gap) => gap.keyword)).toEqual(
        answerKeyOf(id).keywords.missing,
      );
      // The raw list names every Missing keyword too: none was left to the
      // template by the structure step.
      const raw = gapsOutputSchema.parse(rawOf(fixture).data);
      expect(
        raw.gaps.map((item) => normalise(item.keyword)).sort(),
        id,
      ).toEqual(answerKeyOf(id).keywords.missing.map(normalise).sort());
      expect(result.value.meta?.source).toBe("cached");
    },
  );

  it.each(IDS)(
    "%s: every Rewordable gap's citation passes FR-15",
    async (id) => {
      const fixture = (await loadFixtures()).find((f) => f.id === id);
      if (fixture === undefined) throw new Error(`no Fixture ${id}`);
      const result = await analyseCached(fixture);
      if (!result.ok) throw new Error(`expected ok for ${id}`);
      const sentCvText = stripContactDetails(fixture.cvText);
      for (const gap of result.value.gaps) {
        if (gap.kind !== "rewordable") continue;
        expect(gap.citation, `${id} ${gap.keyword}`).not.toBeNull();
        expect(checkCitation(gap, sentCvText), `${id} ${gap.keyword}`).toBe(
          true,
        );
      }
    },
  );

  it.each(IDS)("%s: FR-15 downgrades none of the recorded citations", (id) => {
    const evaluation = evaluateGapsOf(id);
    expect(evaluation.downgraded, id).toBe(0);
  });

  it.each(IDS)(
    "%s: none of the Answer key's must-never-be-Rewordable keywords is Rewordable (G2)",
    async (id) => {
      const fixture = (await loadFixtures()).find((f) => f.id === id);
      if (fixture === undefined) throw new Error(`no Fixture ${id}`);
      const result = await analyseCached(fixture);
      if (!result.ok) throw new Error(`expected ok for ${id}`);
      for (const { keyword } of answerKeyOf(id).mustNeverSuggest) {
        const gap = result.value.gaps.find(
          (candidate) => normalise(candidate.keyword) === normalise(keyword),
        );
        expect(gap, `${id} ${keyword}`).toBeDefined();
        expect(gap?.kind, `${id} ${keyword}`).toBe("real");
      }
      expect(evaluateGapsOf(id).g2Failures, id).toEqual([]);
    },
  );

  it.each(IDS)(
    "%s: every suggestion is null (rewording is off)",
    async (id) => {
      const fixture = (await loadFixtures()).find((f) => f.id === id);
      if (fixture === undefined) throw new Error(`no Fixture ${id}`);
      const result = await analyseCached(fixture);
      if (!result.ok) throw new Error(`expected ok for ${id}`);
      for (const gap of result.value.gaps) expect(gap.suggestion).toBeNull();
    },
  );
});

// The evaluation `scripts/qa-compare.ts` makes, on the recorded file.
function evaluateGapsOf(id: string) {
  const content = JSON.parse(
    readFileSync(`data/fixtures/${id}/cached/gaps.json`, "utf8"),
  ) as { data: unknown };
  return evaluateGaps({
    answerKey: answerKeyOf(id),
    cvText: readFileSync(`data/fixtures/${id}/cv.txt`, "utf8"),
    output: content.data,
  });
}

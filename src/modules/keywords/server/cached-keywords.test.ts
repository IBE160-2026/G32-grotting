import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aiResultMetaSchema } from "@/modules/ai/contracts";
import { proposeKeywords } from "@/modules/keywords/core";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { loadFixtures } from "@/shared/server/data-files";
import { keywordsOutputSchema, PROMPT_VERSION } from "./prompts/keywords";

// FR-5b, FR-27, AD-15: every Fixture has the Keyword list a live request
// returned once (`scripts/record-cached.ts --keywords`), raw and unedited.

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);

describe("FR-5b every Fixture has a Cached Keyword list", () => {
  it("covers all four Fixtures, the held-out one included, and not _planted", async () => {
    const fixtures = await loadFixtures();
    expect(fixtures.map(({ id }) => id)).toEqual([
      "example-nordic-digital",
      "held-out-regnskap-kvale",
      "nursing-sarvurdering",
      "two-column-fjord-analytics",
    ]);
    for (const fixture of fixtures) {
      expect(fixture.cachedKeywords, fixture.id).toBeDefined();
    }
  });

  it("is a raw AiOutput recorded live with the current prompt version (the CI check of AD-15)", async () => {
    for (const fixture of await loadFixtures()) {
      const content = fixture.cachedKeywords?.content as {
        data: unknown;
        meta: unknown;
      };
      const meta = aiResultMetaSchema.parse(content.meta);
      expect(meta.source, fixture.id).toBe("live");
      expect(meta.promptVersion, fixture.id).toBe(PROMPT_VERSION);
      expect(keywordsOutputSchema.safeParse(content.data).success).toBe(true);
    }
  });

  it("leaves a usable list after every term is checked against the ad", async () => {
    for (const fixture of await loadFixtures()) {
      const content = fixture.cachedKeywords?.content as {
        data: { keywords: string[] };
      };
      const kept = proposeKeywords(
        fixture.jobAd,
        content.data.keywords,
        vocabulary,
      );
      // Under 3 would make the app fall back to code for a Fixture.
      expect(kept.length, fixture.id).toBeGreaterThanOrEqual(3);
      expect(kept.length, fixture.id).toBeLessThanOrEqual(
        content.data.keywords.length,
      );
      // The same proposal gives the same list (NFR-6).
      expect(
        proposeKeywords(fixture.jobAd, content.data.keywords, vocabulary),
      ).toEqual(kept);
    }
  });
});

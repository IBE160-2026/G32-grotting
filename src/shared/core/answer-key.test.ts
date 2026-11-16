import { describe, expect, it } from "vitest";
import { answerKeySchema, fixtureMetaSchema } from "./answer-key";

// Made-up keys for the schema rules only. They are not any Fixture's Answer key.
const valid = {
  keywords: { matched: ["Alpha", "Beta", "Gamma"], missing: ["Delta"] },
  score: 75,
  mustNotMatch: [{ term: "Eps", reason: "a different word" }],
  gaps: {
    rewordable: [{ keyword: "Delta", evidence: "a line of the CV" }],
    real: [],
  },
  mustNeverSuggest: [],
};

function issuePaths(input: unknown): string[] {
  const result = answerKeySchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
}

describe("FR-28 Answer key schema (SM-2)", () => {
  it("parses a valid key", () => {
    expect(answerKeySchema.safeParse(valid).success).toBe(true);
  });

  it("rounds the score to a whole number: 2 of 3 is 67", () => {
    const key = {
      ...valid,
      keywords: { matched: ["Alpha", "Beta"], missing: ["Delta"] },
      score: 67,
    };
    expect(answerKeySchema.safeParse(key).success).toBe(true);
  });

  it("fails when the score does not follow from the lists", () => {
    expect(issuePaths({ ...valid, score: 71 })).toEqual(["score"]);
  });

  it("fails when a Keyword is both Matched and Missing, ignoring case", () => {
    const key = {
      ...valid,
      keywords: { matched: ["Alpha", "Beta", "delta"], missing: ["Delta"] },
    };
    expect(issuePaths(key)).toContain("keywords");
  });

  it("fails when a Keyword is repeated", () => {
    const key = {
      ...valid,
      keywords: { matched: ["Alpha", "Alpha", "Beta"], missing: ["Delta"] },
    };
    expect(issuePaths(key)).toContain("keywords");
  });

  it("fails when there are no Keywords at all", () => {
    const key = {
      ...valid,
      keywords: { matched: [], missing: [] },
      score: 0,
      gaps: { rewordable: [], real: [] },
    };
    expect(issuePaths(key)).toEqual(["keywords"]);
  });

  it("fails when a Missing Keyword is in neither gap list", () => {
    const key = { ...valid, gaps: { rewordable: [], real: [] } };
    expect(issuePaths(key)).toEqual(["gaps"]);
  });

  it("fails when a gap is not a Missing Keyword", () => {
    const key = {
      ...valid,
      gaps: { rewordable: valid.gaps.rewordable, real: ["Alpha"] },
    };
    expect(issuePaths(key)).toEqual(["gaps"]);
  });

  it("fails when a Missing Keyword is in both gap lists", () => {
    const key = {
      ...valid,
      gaps: { rewordable: valid.gaps.rewordable, real: ["Delta"] },
    };
    expect(issuePaths(key)).toEqual(["gaps"]);
  });

  it("accepts a must-never-suggest item that is a Real gap", () => {
    const key = {
      ...valid,
      gaps: { rewordable: [], real: ["Delta"] },
      mustNeverSuggest: [{ keyword: "delta", reason: "not in the CV" }],
    };
    expect(answerKeySchema.safeParse(key).success).toBe(true);
  });

  it("fails when a must-never-suggest item is not a Real gap", () => {
    const key = {
      ...valid,
      mustNeverSuggest: [{ keyword: "Delta", reason: "not in the CV" }],
    };
    expect(issuePaths(key)).toEqual(["mustNeverSuggest.0.keyword"]);
  });

  it("fails on an empty reason, a missing part or an unknown field", () => {
    expect(
      answerKeySchema.safeParse({
        ...valid,
        mustNotMatch: [{ term: "Eps", reason: " " }],
      }).success,
    ).toBe(false);
    const { mustNeverSuggest: _removed, ...partial } = valid;
    expect(answerKeySchema.safeParse(partial).success).toBe(false);
    expect(answerKeySchema.safeParse({ ...valid, extra: 1 }).success).toBe(
      false,
    );
  });
});

describe("FR-28 Fixture meta", () => {
  it("needs a job title and an employer", () => {
    expect(
      fixtureMetaSchema.safeParse({ jobTitle: "A", employer: "B" }).success,
    ).toBe(true);
    expect(fixtureMetaSchema.safeParse({ jobTitle: "A" }).success).toBe(false);
    expect(
      fixtureMetaSchema.safeParse({ jobTitle: "A", employer: " " }).success,
    ).toBe(false);
  });
});

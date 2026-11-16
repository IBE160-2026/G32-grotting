import { describe, expect, it } from "vitest";
import { VOCABULARY_VERSION_FORMAT, vocabularySchema } from "./vocabulary";

// Made-up vocabularies for the schema rules only. Not the real one.
const valid = {
  vocabularyVersion: "v1-0123abcd",
  terms: ["Alpha", "beta gamma"],
  aliases: { Alpha: ["a1", "a2"] },
};

function issuePaths(input: unknown): string[] {
  const result = vocabularySchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
}

describe("FR-5 vocabulary schema", () => {
  it("parses a valid vocabulary", () => {
    expect(vocabularySchema.safeParse(valid).success).toBe(true);
  });

  it("exports the version format the schema uses", () => {
    expect(valid.vocabularyVersion).toMatch(VOCABULARY_VERSION_FORMAT);
    expect("v1-0123ABCD").not.toMatch(VOCABULARY_VERSION_FORMAT);
  });

  it("accepts a term without aliases", () => {
    expect(vocabularySchema.safeParse({ ...valid, aliases: {} }).success).toBe(
      true,
    );
  });

  it("rejects a version that does not look like v1-<8 hex>", () => {
    for (const bad of ["", "v1", "v1-0123ABCD", "v2-0123abcd", "v1-0123abc"]) {
      expect(issuePaths({ ...valid, vocabularyVersion: bad })).toEqual([
        "vocabularyVersion",
      ]);
    }
  });

  it("rejects an empty term list and blank terms", () => {
    expect(issuePaths({ ...valid, terms: [], aliases: {} })).toEqual(["terms"]);
    expect(issuePaths({ ...valid, terms: ["Alpha", "  "] })).toEqual([
      "terms.1",
    ]);
  });

  it("rejects terms that are equal once case and spacing are ignored", () => {
    expect(issuePaths({ ...valid, terms: ["Alpha", " alpha "] })).toEqual([
      "terms.1",
    ]);
  });

  it("rejects an alias key that is not a term", () => {
    expect(issuePaths({ ...valid, aliases: { Delta: ["d"] } })).toEqual([
      "aliases.Delta",
    ]);
  });

  it("rejects a blank alias", () => {
    expect(issuePaths({ ...valid, aliases: { Alpha: [""] } })).toEqual([
      "aliases.Alpha.0",
    ]);
  });

  it("rejects unknown fields", () => {
    expect(vocabularySchema.safeParse({ ...valid, extra: 1 }).success).toBe(
      false,
    );
  });
});

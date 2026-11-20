import { describe, expect, it } from "vitest";
import { canonVerbatim } from "./canon-verbatim";

describe("FR-15 canonVerbatim", () => {
  it("ignores case", () => {
    expect(canonVerbatim("Jeg Skrev TESTER")).toBe(
      canonVerbatim("jeg skrev tester"),
    );
    expect(canonVerbatim("ÆØÅ")).toBe(canonVerbatim("æøå"));
  });

  it("reads any run of white space, line breaks included, as one space", () => {
    expect(canonVerbatim("  Bygde en\r\nnettside\n\n som\t\ttilpasser  ")).toBe(
      "bygde en nettside som tilpasser",
    );
    expect(canonVerbatim("a b c")).toBe("a b c");
  });

  it("ignores nothing else", () => {
    // A different letter, a different word, a changed ending, punctuation.
    expect(canonVerbatim("tester")).not.toBe(canonVerbatim("tester."));
    expect(canonVerbatim("våre")).not.toBe(canonVerbatim("dine"));
    expect(canonVerbatim("skrev tester")).not.toBe(
      canonVerbatim("skrive tester"),
    );
    // White space is read as a space, never removed: two words are not one.
    expect(canonVerbatim("test er")).not.toBe(canonVerbatim("tester"));
    // No Unicode normalisation: a decomposed «å» is not a composed «å».
    expect(canonVerbatim("å")).not.toBe(canonVerbatim("å"));
    // No hyphen, quote or dash folding.
    expect(canonVerbatim("REST-API")).not.toBe(canonVerbatim("REST API"));
    expect(canonVerbatim("2023-2026")).not.toBe(canonVerbatim("2023–2026"));
  });
});

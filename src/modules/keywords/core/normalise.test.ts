import { describe, expect, it } from "vitest";
import { normalise } from "./normalise";

// Invisible, decomposed and look-alike characters are written as \u escapes so
// a reader or a formatter cannot change them unnoticed.

describe("FR-6 normalise", () => {
  it("gives one form for hyphen and space variants", () => {
    const variants = ["front-end", "front end", "frontend", "Front\u2011End"];
    for (const v of variants) {
      expect(normalise(v)).toBe("frontend");
    }
  });

  it("treats every dash variant alike", () => {
    const dashes = [
      "-",
      "\u2010",
      "\u2011",
      "\u2012",
      "\u2013",
      "\u2014",
      "\u2015",
      "\u2212",
      "\uFE58",
      "\uFE63",
      "\uFF0D",
    ];
    for (const dash of dashes) {
      expect(normalise(`front${dash}end`)).toBe("frontend");
    }
  });

  it("joins split compounds", () => {
    expect(normalise("data analyse")).toBe(normalise("dataanalyse"));
    expect(normalise("data   \n analyse")).toBe("dataanalyse");
  });

  it("drops soft hyphens, zero-width characters and direction marks", () => {
    expect(normalise("pro\u00ADsjekt\u200Bleder\uFEFF")).toBe("prosjektleder");
    expect(normalise("pro\u200Esjekt\u200Fleder")).toBe("prosjektleder");
  });

  it("spells out PDF ligatures", () => {
    expect(normalise("\uFB01nansiering")).toBe("finansiering");
    expect(normalise("e\uFB03siens")).toBe("effisiens");
  });

  it("folds case and Unicode form, not æøå", () => {
    const upper = normalise("SÅRVURDERING");
    expect(upper).toBe("sårvurdering");
    // composed (U+00E5) and decomposed (a + U+030A) spellings
    expect(normalise("sårvurdering")).toBe(upper);
    expect(normalise("sa\u030Arvurdering")).toBe(upper);
    expect(normalise("saarvurdering")).toBe("saarvurdering");
    expect(normalise("oe")).toBe("oe");
    expect(normalise("ae")).toBe("ae");
    expect(normalise("saarvurdering")).not.toBe(upper);
  });

  it("keeps digits and other punctuation, and spaces next to them", () => {
    expect(normalise("C++ utvikler")).toBe("c++ utvikler");
    expect(normalise("Node.js")).toBe("node.js");
    expect(normalise("ISO 27001")).toBe("iso 27001");
  });

  it("trims and gives an empty string for empty or blank input", () => {
    expect(normalise("")).toBe("");
    expect(normalise("  ")).toBe("");
    expect(normalise(" \t\r\n ")).toBe("");
    expect(normalise("  Agile  ")).toBe("agile");
  });

  it("is deterministic and idempotent", () => {
    const input = "  Front\u2011End  Data analyse ";
    expect(normalise(input)).toBe(normalise(input));
    expect(normalise(normalise(input))).toBe(normalise(input));
  });
});

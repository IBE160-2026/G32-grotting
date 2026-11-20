import { describe, expect, it } from "vitest";
import { cvEntries } from "./cv-entries";

describe("FR-15 cvEntries", () => {
  it("returns the blocks of lines bounded by blank lines, in order", () => {
    const text =
      "Utdanning\nBachelor i informatikk\n\nProsjekt\nJeg skrev tester\nfor skjemaene.";
    expect(cvEntries(text)).toEqual([
      "Utdanning\nBachelor i informatikk",
      "Prosjekt\nJeg skrev tester\nfor skjemaene.",
    ]);
  });

  it("treats a line with only white space as blank, and several blank lines as one boundary", () => {
    expect(cvEntries("A\n \t \n\n\nB")).toEqual(["A", "B"]);
  });

  it("reads CRLF and lone CR as line breaks", () => {
    expect(cvEntries("A\r\nB\r\n\r\nC\r\rD")).toEqual(["A\nB", "C", "D"]);
  });

  it("drops empty blocks and trims each entry", () => {
    expect(cvEntries("\n\n  A  \n\n\n  B\n\n")).toEqual(["A", "B"]);
    expect(cvEntries("")).toEqual([]);
    expect(cvEntries(" \n\n ")).toEqual([]);
  });

  it("returns a text with no blank line as one entry", () => {
    expect(cvEntries("A\nB\nC")).toEqual(["A\nB\nC"]);
  });
});

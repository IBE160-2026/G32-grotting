import { describe, expect, it } from "vitest";
import { splitParagraphs, tokenise } from "./tokenise";

describe("FR-5 tokenise", () => {
  it("finds letters and digits with offsets in the paragraph", () => {
    const text = "Du kan SQL, og ISO 27001.";
    const tokens = tokenise(text);
    expect(tokens.map((token) => token.text)).toEqual([
      "Du",
      "kan",
      "SQL",
      "og",
      "ISO",
      "27001",
    ]);
    for (const token of tokens) {
      expect(text.slice(token.start, token.end)).toBe(token.text);
    }
  });

  it("keeps trailing + and # on a token", () => {
    expect(tokenise("C++, C# og F#.").map((token) => token.text)).toEqual([
      "C++",
      "C#",
      "og",
      "F#",
    ]);
  });

  it("splits «HTML+CSS» but keeps «C+», «C++» and «C#»", () => {
    expect(tokenise("HTML+CSS").map((token) => token.text)).toEqual([
      "HTML",
      "CSS",
    ]);
    expect(tokenise("C+ og C++").map((token) => token.text)).toEqual([
      "C+",
      "og",
      "C++",
    ]);
  });

  it("splits on hyphens, dots and slashes", () => {
    expect(
      tokenise("front-end, Node.js og CI/CD").map((token) => token.text),
    ).toEqual(["front", "end", "Node", "js", "og", "CI", "CD"]);
  });

  it("keeps æøå and combining marks inside a token", () => {
    expect(tokenise("sårvurdering på søndag").map((t) => t.text)).toEqual([
      "sårvurdering",
      "på",
      "søndag",
    ]);
    expect(tokenise("sa\u030Arvurdering").map((t) => t.text)).toEqual([
      "sa\u030Arvurdering",
    ]);
  });

  it("gives no tokens for text without letters or digits", () => {
    expect(tokenise("")).toEqual([]);
    expect(tokenise(" - , . ")).toEqual([]);
  });
});

describe("FR-5 splitParagraphs", () => {
  it("splits on blank lines", () => {
    expect(splitParagraphs("En\nto\n\nTre\n\n\nFire")).toEqual([
      "En\nto",
      "Tre",
      "Fire",
    ]);
  });

  it("turns CRLF into LF before it splits", () => {
    expect(splitParagraphs("En\r\nto\r\n\r\nTre")).toEqual(["En\nto", "Tre"]);
  });

  it("treats a lone CR as a line end", () => {
    expect(splitParagraphs("En\rto\r\rTre")).toEqual(["En\nto", "Tre"]);
  });

  it("counts a line with NBSP or a form feed as blank", () => {
    expect(splitParagraphs("En\n\u00A0\nTo\n\f\nTre")).toEqual([
      "En",
      "To",
      "Tre",
    ]);
  });

  it("counts a line of spaces or tabs as blank", () => {
    expect(splitParagraphs("En\n \t\nTo")).toEqual(["En", "To"]);
  });

  it("drops empty paragraphs at the start and end", () => {
    expect(splitParagraphs("\n\nEn\n\n")).toEqual(["En"]);
  });

  it("gives no paragraphs for an empty text", () => {
    expect(splitParagraphs("")).toEqual([]);
    expect(splitParagraphs("  \n\n  ")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { renderLetter } from "./render-letter";
import { type LetterParagraph, segmentLetter } from "./segment-letter";

const joined = (paragraphs: LetterParagraph[]) =>
  paragraphs.map((paragraph) => paragraph.map((piece) => piece.text).join(""));

// What the plain view shows: `renderLetter`, split at blank lines.
const plain = (text: string, name: string | null = null) =>
  renderLetter(text.replace(/\r\n?/g, "\n"), name)
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim() !== "");

const TEXT =
  "Hei Nordic Digital,\n\nJeg kan TypeScript og ledet gruppen.\nOg TypeScript igjen.\n\nMed hilsen\n{{SIGNATUR}}";
const span = (word: string, nth = 0) => {
  let from = -1;
  for (let i = 0; i <= nth; i++) from = TEXT.indexOf(word, from + 1);
  return { start: from, end: from + word.length };
};

describe("FR-11 segmentLetter", () => {
  it("gives plain pieces only, equal to the plain view, when there are no flags", () => {
    const paragraphs = segmentLetter(TEXT, [], null);
    expect(joined(paragraphs)).toEqual(plain(TEXT));
    for (const paragraph of paragraphs) {
      expect(paragraph.every((piece) => piece.kind === "plain")).toBe(true);
    }
  });

  it("marks each span as a flagged piece tied to its flag, without losing any text", () => {
    const flags = [
      { spans: [span("TypeScript"), span("TypeScript", 1)] },
      { spans: [span("ledet")] },
    ];
    const paragraphs = segmentLetter(TEXT, flags, null);
    expect(joined(paragraphs)).toEqual(plain(TEXT));
    const flagged = paragraphs
      .flat()
      .filter((piece) => piece.kind === "flagged")
      .map((piece) => [piece.text, piece.kind === "flagged" && piece.flag]);
    expect(flagged).toEqual([
      ["TypeScript", 0],
      ["ledet", 1],
      ["TypeScript", 0],
    ]);
  });

  it("puts the name, or the placeholder, in place of the sign-off", () => {
    expect(joined(segmentLetter(TEXT, [], null)).at(-1)).toBe(
      "Med hilsen\n[Navnet ditt]",
    );
    expect(joined(segmentLetter(TEXT, [], "Ola Nordmann")).at(-1)).toBe(
      "Med hilsen\nOla Nordmann",
    );
    expect(joined(segmentLetter(TEXT, [], "Ola $& Nordmann")).at(-1)).toBe(
      "Med hilsen\nOla $& Nordmann",
    );
  });

  it("keeps offsets after the sign-off place correct because they refer to the stored text", () => {
    const text = "{{SIGNATUR}}\n\nVi kan TypeScript.";
    const start = text.indexOf("TypeScript");
    const paragraphs = segmentLetter(
      text,
      [{ spans: [{ start, end: start + 10 }] }],
      "Ola",
    );
    expect(joined(paragraphs)).toEqual(["Ola", "Vi kan TypeScript."]);
    expect(paragraphs[1]?.find((piece) => piece.kind === "flagged")?.text).toBe(
      "TypeScript",
    );
  });

  it("highlights the first of two overlapping spans and drops the rest", () => {
    const text = "Jeg kan TypeScript godt.";
    const paragraphs = segmentLetter(
      text,
      [{ spans: [{ start: 8, end: 18 }] }, { spans: [{ start: 12, end: 22 }] }],
      null,
    );
    expect(joined(paragraphs)).toEqual([text]);
    const flagged = paragraphs.flat().filter((p) => p.kind === "flagged");
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toMatchObject({ text: "TypeScript", flag: 0 });
  });

  it("counts CRLF and lone CR as LF, as the spans do", () => {
    const text = "Hei\r\n\r\nVi kan TypeScript.\rOg mer.";
    const normal = text.replace(/\r\n?/g, "\n");
    const start = normal.indexOf("TypeScript");
    const paragraphs = segmentLetter(
      text,
      [{ spans: [{ start, end: start + 10 }] }],
      null,
    );
    expect(joined(paragraphs)).toEqual(plain(text));
    expect(paragraphs.flat().find((p) => p.kind === "flagged")?.text).toBe(
      "TypeScript",
    );
  });

  it("ignores a span outside the text and drops empty paragraphs", () => {
    const paragraphs = segmentLetter(
      "A\n\n\n\n \n\nB",
      [{ spans: [{ start: 50, end: 60 }] }],
      null,
    );
    expect(joined(paragraphs)).toEqual(plain("A\n\n\n\n \n\nB"));
    expect(paragraphs.flat().every((piece) => piece.kind === "plain")).toBe(
      true,
    );
  });
});

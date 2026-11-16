export type Token = {
  readonly text: string;
  /** Offset in the paragraph. */
  readonly start: number;
  /** Offset in the paragraph, exclusive. */
  readonly end: number;
};

// A token is a run of letters, combining marks and digits, with trailing «+»
// or «#» kept («C++», «C#», «C+»); a «+» before a letter splits («HTML+CSS»). Hyphens, dots, slashes and the like split tokens.
const TOKEN = /[\p{L}\p{M}\p{N}]+(?:\+\+|#|\+(?![\p{L}\p{M}\p{N}]))?/gu;

// A blank line is a line holding only whitespace (tab, NBSP, form feed...).
const BLANK_LINE = /\n(?:[^\S\n]*\n)+/;

/**
 * Paragraphs of a text: CRLF and lone CR become LF, then the text is split
 * on blank lines. Offsets in Keyword positions refer to this CRLF/CR-normalised
 * text. Paragraphs with nothing in them are dropped, so the paragraph numbers
 * of Keyword positions count the paragraphs that exist. The UI uses this same
 * split to find a position again.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(BLANK_LINE)
    .filter((paragraph) => paragraph.trim() !== "");
}

/** The tokens of one paragraph, in order, with their offsets in it. */
export function tokenise(paragraph: string): Token[] {
  return Array.from(paragraph.matchAll(TOKEN), (match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

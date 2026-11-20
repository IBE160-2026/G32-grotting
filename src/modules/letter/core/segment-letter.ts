import { renderLetter } from "./render-letter";

// What the view needs of a flag: where its word stands.
type SpanOf = { readonly spans: readonly { start: number; end: number }[] };

/** A stretch of the Letter: plain, or a flagged word tied to its flag. */
export type LetterPiece =
  | { readonly kind: "plain"; readonly text: string }
  | {
      readonly kind: "flagged";
      readonly text: string;
      // The index of the flag in the list the caller gave.
      readonly flag: number;
    };

export type LetterParagraph = readonly LetterPiece[];

type Mark = { readonly start: number; readonly end: number; flag: number };

// The spans of every flag in text order. A span that overlaps an earlier one is
// dropped: the first is highlighted, the list still holds every flag.
function marksOf(flags: readonly SpanOf[], length: number): Mark[] {
  const all = flags.flatMap((flag, index) =>
    flag.spans.map((span) => ({ ...span, flag: index })),
  );
  all.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Mark[] = [];
  let reached = 0;
  for (const mark of all) {
    if (mark.start < reached || mark.end <= mark.start || mark.end > length) {
      continue;
    }
    kept.push(mark);
    reached = mark.end;
  }
  return kept;
}

/**
 * The Letter as the screen shows it, in paragraphs of plain and flagged pieces
 * (FR-11). `text` is the stored Letter text with its sign-off token; the spans
 * are offsets in it (CRLF and lone CR counted as LF). The sign-off becomes the
 * name, or the placeholder, as in `renderLetter`, and paragraphs split where
 * `renderLetter`'s output holds a blank line, so the pieces of a paragraph join
 * to what the plain view shows. Pure; nothing is removed or rewritten.
 */
export function segmentLetter(
  text: string,
  flags: readonly SpanOf[],
  name: string | null,
): LetterParagraph[] {
  const normal = text.replace(/\r\n?/g, "\n");
  const pieces: LetterPiece[] = [];
  let at = 0;
  for (const mark of marksOf(flags, normal.length)) {
    pieces.push({ kind: "plain", text: normal.slice(at, mark.start) });
    pieces.push({
      kind: "flagged",
      text: normal.slice(mark.start, mark.end),
      flag: mark.flag,
    });
    at = mark.end;
  }
  pieces.push({ kind: "plain", text: normal.slice(at) });

  const paragraphs: LetterPiece[][] = [[]];
  for (const piece of pieces) {
    if (piece.kind === "flagged") {
      paragraphs[paragraphs.length - 1]?.push(piece);
      continue;
    }
    // Split plain text at blank lines, keeping the pieces apart.
    const parts = renderLetter(piece.text, name).split(/\n{2,}/);
    parts.forEach((part, index) => {
      if (index > 0) paragraphs.push([]);
      if (part !== "") {
        paragraphs[paragraphs.length - 1]?.push({ kind: "plain", text: part });
      }
    });
  }
  return paragraphs.filter((paragraph) =>
    paragraph.some((piece) => piece.text.trim() !== ""),
  );
}

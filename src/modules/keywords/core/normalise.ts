import { canon } from "@/shared/core/canon";

// PDF extraction leaves these inside words: soft hyphen (U+00AD), zero-width
// space, non-joiner and joiner (U+200B-U+200D), left-to-right and right-to-left
// marks (U+200E, U+200F), word joiner (U+2060) and BOM (U+FEFF).
const INVISIBLE = /[\u00AD\u200B-\u200F\u2060\uFEFF]/g;

// Typographic ligatures (U+FB00 to U+FB06: ff, fi, fl, ffi, ffl) that PDFs keep as one
// character; NFC leaves them alone, so they are spelled out here.
const LIGATURE = /[\uFB00-\uFB06]/g;

// Hyphen-minus, the U+2010-U+2015 dashes (hyphen, non-breaking hyphen, figure
// dash, en dash, em dash, horizontal bar), minus sign (U+2212), small
// hyphen-minus (U+FE63), small em dash (U+FE58) and full-width hyphen-minus
// (U+FF0D).
const DASH = /[-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

// Whitespace with a letter (or a combining mark) on both sides. Whitespace
// next to digits or punctuation is kept, so «c++ utvikler» stays two words.
const SPACE_BETWEEN_LETTERS = /(?<=[\p{L}\p{M}])\s+(?=[\p{L}\p{M}])/gu;

/**
 * The comparison form of a term: NFC, lower case, PDF artefacts dropped, every
 * dash and every space between two letters removed («front-end», «front end»
 * and «frontend» are alike), remaining whitespace collapsed, trimmed.
 *
 * æøå are not folded to ASCII: «aa», «oe» and «ae» stay what they are, since
 * looser matching would raise scores dishonestly.
 */
export function normalise(term: string): string {
  const folded = term
    .normalize("NFC")
    .toLowerCase()
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(LIGATURE, (ligature) => ligature.normalize("NFKC"))
    .replace(DASH, "")
    .replace(SPACE_BETWEEN_LETTERS, "");
  return canon(folded);
}

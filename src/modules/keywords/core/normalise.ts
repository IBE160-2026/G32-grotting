import { canon } from "@/shared/core/canon";

// Soft hyphen, zero-width space/non-joiner/joiner, word joiner and BOM: PDF
// extraction leaves these inside words.
const INVISIBLE = /[­​-‍⁠﻿]/g;

// Hyphen-minus, the U+2010..U+2015 dashes (hyphen, non-breaking hyphen, figure
// dash, en dash, em dash, horizontal bar), minus sign, small and full-width
// hyphen-minus.
const DASH = /[-‐-―−﹘﹣－]/g;

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
    .replace(DASH, "")
    .replace(SPACE_BETWEEN_LETTERS, "");
  return canon(folded);
}

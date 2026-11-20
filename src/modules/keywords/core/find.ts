import type { Vocabulary } from "@/shared/core/vocabulary";
import {
  candidatesIn,
  indexOf,
  type KeywordStage,
  keepNonOverlapping,
  orderCandidates,
} from "./spans";

export type KeywordHit = {
  readonly stage: KeywordStage;
  /** 1-based number of the line in the text (CRLF and lone CR count as LF). */
  readonly line: number;
  /** The whole line the Keyword was found on: the Evidence. */
  readonly text: string;
  /** Offsets of the match in the line, end exclusive. */
  readonly start: number;
  readonly end: number;
};

/**
 * Finds a Keyword in the CV text through the same pipeline as extraction (FR-6):
 * the term and its aliases from the vocabulary, case ignored, inflections,
 * hyphen and space variants and split compounds accepted. A word that only
 * shares part of a compound does not match. A match sits on one line. Hits come
 * in text order; no hit means the Keyword is Missing. A term outside the
 * vocabulary (an AI-proposed Keyword, FR-5b) is searched by its own words, with
 * no aliases. Pure and synchronous.
 */
export function findKeyword(
  text: string,
  keyword: { readonly term: string },
  vocabulary: Vocabulary,
): KeywordHit[] {
  // The search runs over a vocabulary of this one term and its aliases. A term
  // the vocabulary does not hold (an AI-proposed Keyword, FR-5b) has no
  // aliases and is found by its own words.
  const own: Vocabulary = {
    vocabularyVersion: vocabulary.vocabularyVersion,
    terms: [keyword.term],
    aliases: Object.hasOwn(vocabulary.aliases, keyword.term)
      ? { [keyword.term]: vocabulary.aliases[keyword.term] }
      : {},
  };
  const index = indexOf(own);
  const stems = new Map<string, string>();

  const hits: KeywordHit[] = [];
  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((line, lineIndex) => {
      const all = candidatesIn(line, lineIndex, index, stems);
      for (const candidate of keepNonOverlapping(orderCandidates(all))) {
        hits.push({
          stage: candidate.stage,
          line: lineIndex + 1,
          text: line,
          start: candidate.start,
          end: candidate.end,
        });
      }
    });
  return hits.sort((a, b) => a.line - b.line || a.start - b.start);
}

import { canon } from "@/shared/core/canon";
import type { Vocabulary } from "@/shared/core/vocabulary";
import type { Keyword, KeywordPosition } from "./extract";
import { findKeyword } from "./find";
import {
  candidatesIn,
  indexOf,
  type KeywordStage,
  keepNonOverlapping,
  orderCandidates,
} from "./spans";
import { splitParagraphs } from "./tokenise";

// A proposal longer than this is not a Keyword; a span holds at most 5 tokens
// anyway, so it could not be found.
const MAX_TERM_LENGTH = 80;

const keyOf = (term: string) => canon(term).toLowerCase();

/**
 * Keeps the terms an AI proposed for a Job ad that the ad really contains
 * (FR-5b): a term is kept only when `findKeyword` finds it in the ad, through
 * the same normalise and stem pipeline as extraction. The rest are dropped.
 * A term the vocabulary also holds keeps the vocabulary's spelling and aliases;
 * duplicates count once. The result carries each Keyword's positions in the ad
 * and is ordered by first position, then by term, so the same ad and the same
 * proposal always give the same list (NFR-6). Pure and synchronous. Unlike
 * `extractKeywords` it has no minimum: the caller decides what is too few.
 */
export function proposeKeywords(
  adText: string,
  proposed: readonly string[],
  vocabulary: Vocabulary,
): Keyword[] {
  const vocabularyTerm = new Map(
    vocabulary.terms.map((term) => [keyOf(term), term] as const),
  );
  const paragraphs = splitParagraphs(adText);
  const seen = new Set<string>();
  const found: { keyword: Keyword; first: KeywordPosition }[] = [];

  for (const raw of proposed) {
    const written = canon(raw);
    const key = keyOf(written);
    if (written === "" || written.length > MAX_TERM_LENGTH || seen.has(key)) {
      continue;
    }
    seen.add(key);
    const term = vocabularyTerm.get(key) ?? written;
    // The ad is searched by the same function that finds a Keyword in a CV.
    if (findKeyword(adText, { term }, vocabulary).length === 0) continue;

    const own: Vocabulary = {
      vocabularyVersion: vocabulary.vocabularyVersion,
      terms: [term],
      aliases: Object.hasOwn(vocabulary.aliases, term)
        ? { [term]: vocabulary.aliases[term] }
        : {},
    };
    const index = indexOf(own);
    const stems = new Map<string, string>();
    const positions: KeywordPosition[] = [];
    let stage: KeywordStage | undefined;
    paragraphs.forEach((paragraph, paragraphIndex) => {
      const all = candidatesIn(paragraph, paragraphIndex, index, stems);
      for (const candidate of keepNonOverlapping(orderCandidates(all))) {
        stage ??= candidate.stage;
        positions.push({
          paragraph: candidate.paragraph,
          start: candidate.start,
          end: candidate.end,
        });
      }
    });
    const [first] = positions;
    if (stage === undefined || first === undefined) continue;
    found.push({ keyword: { term, stage, positions }, first });
  }

  return found
    .sort(
      (a, b) =>
        a.first.paragraph - b.first.paragraph ||
        a.first.start - b.first.start ||
        a.keyword.term.localeCompare(b.keyword.term, "nb"),
    )
    .map(({ keyword }) => keyword);
}

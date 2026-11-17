import { err, ok, type Result } from "@/shared/core/result";
import type { Vocabulary } from "@/shared/core/vocabulary";
import {
  type Candidate,
  candidatesIn,
  indexOf,
  type KeywordStage,
  keepNonOverlapping,
  orderCandidates,
} from "./spans";
import { splitParagraphs } from "./tokenise";

export type { KeywordStage } from "./spans";

export type KeywordPosition = {
  readonly paragraph: number;
  readonly start: number;
  readonly end: number;
};

export type Keyword = {
  readonly term: string;
  /** The stage of the first position. */
  readonly stage: KeywordStage;
  readonly positions: readonly KeywordPosition[];
};

/**
 * The Keywords of a job ad: vocabulary terms and aliases found through the
 * normalise and stem pipeline (FR-5). Pure and synchronous; the same ad and
 * vocabulary always give the same list (NFR-6), in order of first position.
 * Fewer than 3 distinct Keywords is an error (FR-4).
 */
export function extractKeywords(
  adText: string,
  vocabulary: Vocabulary,
): Result<Keyword[], "TOO_FEW_KEYWORDS"> {
  const index = indexOf(vocabulary);
  const stems = new Map<string, string>();

  const kept: Candidate[] = [];
  splitParagraphs(adText).forEach((paragraph, paragraphIndex) => {
    const all = candidatesIn(paragraph, paragraphIndex, index, stems);
    kept.push(...keepNonOverlapping(orderCandidates(all)));
  });

  kept.sort((a, b) => a.paragraph - b.paragraph || a.start - b.start);

  const byTerm = new Map<
    number,
    { stage: KeywordStage; positions: KeywordPosition[] }
  >();
  for (const candidate of kept) {
    const position = {
      paragraph: candidate.paragraph,
      start: candidate.start,
      end: candidate.end,
    };
    const existing = byTerm.get(candidate.termIndex);
    if (existing) {
      existing.positions.push(position);
    } else {
      byTerm.set(candidate.termIndex, {
        stage: candidate.stage,
        positions: [position],
      });
    }
  }

  const keywords: Keyword[] = Array.from(byTerm, ([termIndex, found]) => ({
    term: vocabulary.terms[termIndex],
    stage: found.stage,
    positions: found.positions,
  }));
  return keywords.length < 3 ? err("TOO_FEW_KEYWORDS") : ok(keywords);
}

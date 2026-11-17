import type { KeywordSource } from "@/modules/keywords/contracts";
import { findKeyword, type Keyword } from "@/modules/keywords/core";
import type { Vocabulary } from "@/shared/core/vocabulary";
import type {
  AnalysisResult,
  MatchedKeyword,
  MissingKeyword,
} from "../contracts";
import { scoreOf } from "./score";

/**
 * Looks each Keyword up in the CV and scores the result (FR-5, FR-6, FR-7).
 * A Keyword with a hit is Matched, with the first hit as Evidence; otherwise
 * it is Missing with an explanation key. Both lists keep the order of
 * `keywords`. Pure; throws `RangeError` when `keywords` is empty.
 */
export function analyse(
  cvText: string,
  keywords: readonly Keyword[],
  vocabulary: Vocabulary,
  context: { keywordSource: KeywordSource; adParagraphs: number },
): AnalysisResult {
  const matched: MatchedKeyword[] = [];
  const missing: MissingKeyword[] = [];

  for (const keyword of keywords) {
    const adSide = {
      term: keyword.term,
      stage: keyword.stage,
      positions: keyword.positions.map((position) => ({ ...position })),
    };
    const [hit] = findKeyword(cvText, keyword, vocabulary);
    if (hit) {
      matched.push({
        ...adSide,
        evidence: {
          stage: hit.stage,
          line: hit.line,
          text: hit.text,
          start: hit.start,
          end: hit.end,
        },
      });
    } else {
      missing.push({
        ...adSide,
        explanation: {
          key: "MISSING_KEYWORD",
          params: { keyword: keyword.term },
        },
      });
    }
  }

  const totalCount = keywords.length;
  const score = scoreOf(matched.length, totalCount);
  return {
    keywordSource: context.keywordSource,
    score,
    matchedCount: matched.length,
    totalCount,
    adParagraphs: context.adParagraphs,
    formula: {
      key: "MATCH_FORMULA",
      params: { matched: matched.length, total: totalCount, score },
    },
    matched,
    missing,
  };
}

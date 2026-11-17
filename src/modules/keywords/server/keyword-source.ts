import type { KeywordSource } from "@/modules/keywords/contracts";
import { extractKeywords, type Keyword } from "@/modules/keywords/core";
import { ok, type Result } from "@/shared/core/result";
import type { Vocabulary } from "@/shared/core/vocabulary";

export type ResolvedKeywords = {
  readonly keywords: Keyword[];
  readonly keywordSource: KeywordSource;
};

/**
 * The only way Keywords reach `match` (AD-5). Phase 1 resolves them with code
 * alone, so the source is always `code`; the saved and fallback sources join
 * here later.
 */
export function resolveKeywords(
  jobAd: string,
  options: { vocabulary: Vocabulary },
): Result<ResolvedKeywords, "TOO_FEW_KEYWORDS"> {
  const extracted = extractKeywords(jobAd, options.vocabulary);
  if (!extracted.ok) return extracted;
  return ok({ keywords: extracted.value, keywordSource: "code" });
}

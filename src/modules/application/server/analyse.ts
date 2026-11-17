import { resolveKeywords } from "@/modules/keywords";
import { splitParagraphs } from "@/modules/keywords/core";
import { analyse } from "@/modules/match";
import type { AnalysisResult } from "@/modules/match/contracts";
import { err, ok, type Result } from "@/shared/core/result";
import type { Vocabulary } from "@/shared/core/vocabulary";
import type { AnalysisInputs } from "../contracts";
import { fingerprintOf } from "../core/fingerprint";

/**
 * Phase 1 of an analysis: Keywords by code, score, fingerprint. No AI request,
 * no network, nothing stored.
 */
export function analyseInputs(
  inputs: AnalysisInputs,
  vocabulary: Vocabulary,
): Result<{ result: AnalysisResult; fingerprint: string }, "TOO_FEW_KEYWORDS"> {
  const resolved = resolveKeywords(inputs.jobAd, { vocabulary });
  if (!resolved.ok) return err(resolved.error);
  const { keywords, keywordSource } = resolved.value;

  const result = analyse(inputs.cvText, keywords, vocabulary, {
    keywordSource,
    adParagraphs: splitParagraphs(inputs.jobAd).length,
  });
  const fingerprint = fingerprintOf(
    inputs,
    vocabulary.vocabularyVersion,
    keywordSource,
  );
  return ok({ result, fingerprint });
}

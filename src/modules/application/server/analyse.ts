import { resolveKeywords } from "@/modules/keywords";
import { splitParagraphs } from "@/modules/keywords/core";
import { analyse } from "@/modules/match";
import type { AnalysisResult } from "@/modules/match/contracts";
import { err, ok, type Result } from "@/shared/core/result";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { loadExamplePair, loadVocabulary } from "@/shared/server/data-files";
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

type ExampleTerm = {
  readonly term: string;
  readonly positions: { paragraph: number; start: number; end: number }[];
};

/** The Example ad's phase-1 data for the pulse plot on Hjem: plain values. */
export type ExampleAnalysis = {
  readonly paragraphs: string[];
  readonly matched: ExampleTerm[];
  readonly missing: ExampleTerm[];
};

const termOf = ({ term, positions }: ExampleTerm): ExampleTerm => ({
  term,
  positions: positions.map((position) => ({ ...position })),
});

/**
 * Phase 1 on the Example pair Fixture, for Hjem (FR-8): the ad's paragraphs and
 * the Matched and Missing terms with their positions. Runs the same
 * `analyseInputs` as the route, so the plot cannot differ from the result.
 * Throws when the Fixture cannot be read or analysed.
 */
export async function analyseExample(): Promise<ExampleAnalysis> {
  const [pair, vocabulary] = await Promise.all([
    loadExamplePair(),
    loadVocabulary(),
  ]);
  const analysed = analyseInputs(pair, vocabulary);
  if (!analysed.ok) throw new Error(`Example pair: ${analysed.error}`);
  const { matched, missing } = analysed.value.result;
  return {
    paragraphs: splitParagraphs(pair.jobAd),
    matched: matched.map(termOf),
    missing: missing.map(termOf),
  };
}

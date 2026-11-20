import { checkLetter } from "@/modules/integrity/core";
import type {
  LetterCheck,
  LetterCheckRequest,
} from "@/modules/letter/contracts";
import { err, ok, type Result } from "@/shared/core/result";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { analyseInputs } from "./analyse";

/**
 * The integrity guard on a Letter (FR-11, AD-6): phase 1 is recomputed from the
 * raw inputs, never from anything the client sends, and the fingerprint must
 * match (else `ANALYSIS_STALE`). The Missing keywords of that analysis are the
 * Unsupported claims to look for. No AI request, nothing stored.
 */
export async function checkLetterFor(
  request: LetterCheckRequest,
  vocabulary: Vocabulary,
): Promise<Result<LetterCheck, "TOO_FEW_KEYWORDS" | "ANALYSIS_STALE">> {
  const analysed = await analyseInputs(request.inputs, vocabulary);
  if (!analysed.ok) return err(analysed.error);
  if (analysed.value.fingerprint !== request.fingerprint) {
    return err("ANALYSIS_STALE");
  }
  const { inputs, letter } = request;
  const flags = checkLetter({
    letter: letter.text,
    cvText: inputs.cvText,
    jobTitle: inputs.jobTitle,
    employer: inputs.employer,
    missing: analysed.value.result.missing.map(({ term }) => ({ term })),
    gaps: request.gaps,
    vocabulary,
  });
  return ok({
    flags,
    letterRev: request.letterRev,
    gapsRev: request.gapsRev,
  });
}

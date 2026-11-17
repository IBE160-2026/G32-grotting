import { createHash } from "node:crypto";
import type { KeywordSource } from "@/modules/keywords/contracts";
import { canon } from "@/shared/core/canon";
import { type AnalysisInputs, CONTRACT_VERSION } from "../contracts";

/**
 * The fingerprint of an analysis (AD-6): a hex sha256 of the canon inputs, the
 * vocabulary version, the Keyword source and the contract version. A JSON array
 * keeps field boundaries from being confused. Only this file computes it.
 */
export function fingerprintOf(
  inputs: AnalysisInputs,
  vocabularyVersion: string,
  keywordSource: KeywordSource,
): string {
  const parts = [
    canon(inputs.cvText),
    canon(inputs.jobAd),
    canon(inputs.jobTitle),
    canon(inputs.employer),
    vocabularyVersion,
    keywordSource,
    CONTRACT_VERSION,
  ];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

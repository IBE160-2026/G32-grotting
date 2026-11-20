import { createHash } from "node:crypto";
import { canon } from "@/shared/core/canon";
import { contentHash } from "@/shared/server/content-hash";

// The Keyword request: only the Job ad is sent, so only the ad is its key.
export const KEYWORDS_TASK = "keywords";

// The Gaps request: the CV and the ad are its key, with no title, employer or
// tone (AD-15).
export const GAPS_TASK = "gaps";

export type LookupKeyInputs = {
  readonly task: string;
  readonly cvText?: string;
  readonly jobAd: string;
  readonly jobTitle?: string;
  readonly employer?: string;
  readonly tone?: string;
};

/**
 * The key of an AI request (AD-15): a hex sha256 of a JSON array of the canon
 * inputs, the task and the tone, as `fingerprintOf` does for an analysis. It is
 * made from the unstripped inputs, so the same request always finds the same
 * Cached response (Story 3.5). A JSON array keeps field boundaries from being
 * confused. The Keyword task is the exception: `contentHash(canon(ad))`.
 */
export function lookupKeyOf(inputs: LookupKeyInputs): string {
  // The Keyword request is keyed by the ad alone, `contentHash(canon(ad))`, the
  // key of a saved list in `keyword_lists` too (AD-15, FR-5b).
  if (inputs.task === KEYWORDS_TASK) return contentHash(inputs.jobAd);
  const parts = [
    canon(inputs.cvText ?? ""),
    canon(inputs.jobAd),
    canon(inputs.jobTitle ?? ""),
    canon(inputs.employer ?? ""),
    inputs.task,
    inputs.tone ?? "",
  ];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

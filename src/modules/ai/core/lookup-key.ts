import { createHash } from "node:crypto";
import { canon } from "@/shared/core/canon";

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
 * confused.
 */
export function lookupKeyOf(inputs: LookupKeyInputs): string {
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

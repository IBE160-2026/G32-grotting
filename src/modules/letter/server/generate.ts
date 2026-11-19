import { z } from "zod";
import { type AiContext, type AiFailure, runAi } from "@/modules/ai";
import type { AiResultMeta } from "@/modules/ai/contracts";
import type { AnalysisInputs } from "@/modules/application/contracts";
import { err, ok, type Result } from "@/shared/core/result";
import type { Letter, Tone } from "../contracts";
import { normaliseLetter } from "../core/normalise-letter";
import { letterPromptBuilder, PROMPT_VERSION } from "./prompts/letter";

// What the AI must return: the text only. Tone and `rev` are ours to set.
const outputSchema = z.object({ text: z.string() });

export type GenerateLetterInput = {
  readonly inputs: AnalysisInputs;
  readonly tone: Tone;
  // The Matched keywords from the server's own phase-1 analysis.
  readonly matchedTerms: readonly string[];
  readonly previousRev: number;
};

type RunOptions = Parameters<typeof runAi>[2];

/**
 * One `runAi` call for the Letter (FR-9, FR-10). The answer gets exactly one
 * sign-off token (FR-12) and `rev` is the next number after `previousRev`.
 * Every `AiFailure` passes through; a blank answer is a retryable provider
 * error. `options` is the test seam of `runAi`.
 */
export async function generateLetter(
  input: GenerateLetterInput,
  ctx: AiContext,
  options?: RunOptions,
): Promise<Result<{ letter: Letter; meta: AiResultMeta }, AiFailure>> {
  const { inputs, tone } = input;
  const run = await runAi(
    {
      task: "letter",
      cvText: inputs.cvText,
      jobAd: inputs.jobAd,
      tone,
      jobTitle: inputs.jobTitle,
      employer: inputs.employer,
      promptVersion: PROMPT_VERSION,
      buildPrompt: letterPromptBuilder({
        jobAd: inputs.jobAd,
        jobTitle: inputs.jobTitle,
        employer: inputs.employer,
        tone,
        matchedTerms: input.matchedTerms,
      }),
      schema: outputSchema,
    },
    ctx,
    options,
  );
  if (!run.ok) return run;

  const text = normaliseLetter(run.value.data.text);
  if (text === null) {
    return err({ code: "AI_PROVIDER_ERROR", retryable: true });
  }
  return ok({
    letter: { text, tone, rev: input.previousRev + 1 },
    meta: run.value.meta,
  });
}

import { z } from "zod";
import { type AiContext, type AiFailure, runAi } from "@/modules/ai";
import type { AiResultMeta } from "@/modules/ai/contracts";
import type { AnalysisInputs } from "@/modules/application/contracts";
import { checkCitation } from "@/modules/integrity/core";
import { canon } from "@/shared/core/canon";
import { err, ok, type Result } from "@/shared/core/result";
import { log } from "@/shared/server/log";
import { type Gap, REAL_GAP_KEY } from "../contracts";
import { gapsPromptBuilder, PROMPT_VERSION } from "./prompts/gaps";

// What the AI must return: an object with a list. Each item is checked on its
// own, so one malformed item is a skipped Keyword (a template Real gap) and
// never fails the whole answer. A `suggestion` is ignored (Epic 5).
const itemSchema = z.object({
  keyword: z.string(),
  kind: z.string(),
  explanation: z.string().nullish(),
  citation: z.string().nullish(),
});
const outputSchema = z.object({ gaps: z.array(z.unknown()) });

export type AiGapItem = z.infer<typeof itemSchema>;

const keyOf = (keyword: string) => canon(keyword).toLowerCase();

// The fixed Real gap of a skipped or unusable item (AD-7, AD-14).
const templateGap = (keyword: string): Gap => ({
  keyword,
  kind: "real",
  explanation: { key: REAL_GAP_KEY, params: { keyword } },
  citation: null,
  suggestion: null,
});

function gapOf(keyword: string, item: AiGapItem | undefined): Gap {
  if (item === undefined) return templateGap(keyword);
  const text = item.explanation?.trim() ?? "";
  if (text === "") return templateGap(keyword);
  const kind = item.kind.trim().toLowerCase();
  if (kind === "real") {
    return {
      keyword,
      kind: "real",
      explanation: { text },
      citation: null,
      suggestion: null,
    };
  }
  if (kind === "rewordable") {
    // A Rewordable gap quotes the CV. Whether the quote is really there is the
    // FR-15 step (`checkGapCitations`); a missing quote is already not Rewordable.
    const citation = item.citation?.trim() ?? "";
    if (citation === "") return templateGap(keyword);
    return {
      keyword,
      kind: "rewordable",
      explanation: { text },
      citation,
      suggestion: null,
    };
  }
  return templateGap(keyword);
}

/**
 * The structure step (AD-14): exactly one Gap per Missing keyword, in the order
 * of the Missing list. Items for a keyword that is not missing are dropped, the
 * first item per keyword wins, and a keyword the AI skipped, or answered with
 * an unusable item, becomes the template Real gap. Every `suggestion` is
 * `null`: this story asks for none, and with rewording off none may pass.
 */
export function structureGaps(
  missingTerms: readonly string[],
  items: readonly AiGapItem[],
): Gap[] {
  const first = new Map<string, AiGapItem>();
  for (const item of items) {
    const key = keyOf(item.keyword);
    if (!first.has(key)) first.set(key, item);
  }
  return missingTerms.map((term) => gapOf(term, first.get(keyOf(term))));
}

/**
 * FR-15, after the structure step (AD-14): a Rewordable gap whose citation is
 * not in the CV text word for word (`checkCitation`: case and white space
 * ignored, nothing looser) becomes the fixed Real-gap template. Its AI
 * explanation, citation and suggestion are dropped. Real gaps pass unchanged.
 * `downgraded` is the number of Gaps turned into the template.
 */
export function checkGapCitations(
  gaps: readonly Gap[],
  sentCvText: string,
): { gaps: Gap[]; downgraded: number } {
  let downgraded = 0;
  const checked = gaps.map((gap) => {
    if (gap.kind !== "rewordable" || checkCitation(gap, sentCvText)) return gap;
    downgraded += 1;
    return templateGap(gap.keyword);
  });
  return { gaps: checked, downgraded };
}

export type AnalyseGapsInput = {
  readonly inputs: AnalysisInputs;
  // The Missing keywords from the server's own phase-1 analysis, in order.
  readonly missingTerms: readonly string[];
};

type RunOptions = Parameters<typeof runAi>[2];

/**
 * One `runAi` call for the Gap analysis (FR-13, FR-14). With no Missing
 * keyword there is nothing to judge and no request is made. Every `AiFailure`
 * passes through. After the structure step every Rewordable citation is
 * checked against the sent CV text (FR-15) and the downgrades are logged as a
 * count. `options` is the test seam of `runAi`.
 */
export async function analyseGaps(
  input: AnalyseGapsInput,
  ctx: AiContext,
  options?: RunOptions,
): Promise<Result<{ gaps: Gap[]; meta: AiResultMeta | null }, AiFailure>> {
  const { inputs, missingTerms } = input;
  if (missingTerms.length === 0) return ok({ gaps: [], meta: null });

  // No job title, employer or tone: the Gaps lookup key is the CV and the ad
  // alone (AD-15).
  const run = await runAi(
    {
      task: "gaps",
      cvText: inputs.cvText,
      jobAd: inputs.jobAd,
      promptVersion: PROMPT_VERSION,
      buildPrompt: gapsPromptBuilder({ jobAd: inputs.jobAd, missingTerms }),
      schema: outputSchema,
    },
    ctx,
    options,
  );
  if (!run.ok) return err(run.error);

  const structured = structureGaps(
    missingTerms,
    run.value.data.gaps.flatMap((item) => {
      const parsed = itemSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  );
  // Citations are checked against the CV text that was sent, not the raw one.
  const { gaps, downgraded } = checkGapCitations(
    structured,
    run.value.sentCvText,
  );
  // A count only (AD-14): never a keyword, a citation or any CV text.
  log({ kind: "gaps", downgraded });
  return ok({ gaps, meta: run.value.meta });
}

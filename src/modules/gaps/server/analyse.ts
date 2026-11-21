import { z } from "zod";
import { type AiContext, type AiFailure, GAPS_TASK, runAi } from "@/modules/ai";
import type { AiResultMeta } from "@/modules/ai/contracts";
import type { AnalysisInputs } from "@/modules/application/contracts";
import { checkCitation, checkSuggestion } from "@/modules/integrity/core";
import { canon } from "@/shared/core/canon";
import { err, ok, type Result } from "@/shared/core/result";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { log } from "@/shared/server/log";
import { type Gap, REAL_GAP_KEY } from "../contracts";
import {
  gapsOutputSchema,
  gapsPromptBuilder,
  PROMPT_VERSION,
} from "./prompts/gaps";

// Each item of the AI's list is checked on its own, so one malformed item is a
// skipped Keyword (a template Real gap) and never fails the whole answer
// (`gapsOutputSchema` already turns a malformed item into an empty one). A
// `suggestion` is read only for a Rewordable gap with `features.rewording` on.
const itemSchema = z.object({
  keyword: z.string(),
  kind: z.string(),
  explanation: z.string().nullish(),
  citation: z.string().nullish(),
  suggestion: z.string().nullish(),
});

export type AiGapItem = z.infer<typeof itemSchema>;

// No term and no alias: `findKeyword` then searches a keyword by its own words.
const NO_VOCABULARY: Vocabulary = {
  vocabularyVersion: "v1-00000000",
  terms: [],
  aliases: {},
};

const keyOf = (keyword: string) => canon(keyword).toLowerCase();

// The fixed Real gap of a skipped or unusable item (AD-7, AD-14).
const templateGap = (keyword: string): Gap => ({
  keyword,
  kind: "real",
  explanation: { key: REAL_GAP_KEY, params: { keyword } },
  citation: null,
  suggestion: null,
});

function gapOf(
  keyword: string,
  item: AiGapItem | undefined,
  rewording: boolean,
): Gap {
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
    // One suggestion per Rewordable gap when rewording is on. A missing or
    // blank one stays `null`: the code never writes a suggestion itself.
    const suggestion = rewording ? (item.suggestion?.trim() ?? "") : "";
    return {
      keyword,
      kind: "rewordable",
      explanation: { text },
      citation,
      suggestion: suggestion === "" ? null : suggestion,
    };
  }
  return templateGap(keyword);
}

/**
 * The structure step (AD-14): exactly one Gap per Missing keyword, in the order
 * of the Missing list. Items for a keyword that is not missing are dropped, the
 * first item per keyword wins, and a keyword the AI skipped, or answered with
 * an unusable item, becomes the template Real gap. A `suggestion` is kept only
 * on a Rewordable gap and only with `rewording` on (FR-16); a Real gap, the
 * template and every Gap with rewording off have `null`.
 */
export function structureGaps(
  missingTerms: readonly string[],
  items: readonly AiGapItem[],
  rewording = false,
): Gap[] {
  const first = new Map<string, AiGapItem>();
  for (const item of items) {
    const key = keyOf(item.keyword);
    if (!first.has(key)) first.set(key, item);
  }
  return missingTerms.map((term) =>
    gapOf(term, first.get(keyOf(term)), rewording),
  );
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

/**
 * FR-17, after FR-15 (AD-14): a suggestion that names a Missing keyword other
 * than its own Gap's, or uses an Upgrade word the cited CV entry lacks, is
 * discarded: it becomes `null` while the citation and the explanation stay.
 * Real gaps and Gaps with no suggestion pass unchanged. `discarded` is the
 * number of suggestions thrown out. `missingTerms` is the whole Missing list.
 */
export function checkGapSuggestions(
  gaps: readonly Gap[],
  missingTerms: readonly string[],
  sentCvText: string,
  vocabulary: Vocabulary = NO_VOCABULARY,
): { gaps: Gap[]; discarded: number } {
  let discarded = 0;
  const checked = gaps.map((gap) => {
    if (gap.kind !== "rewordable" || gap.suggestion === null) return gap;
    const verdict = checkSuggestion({
      suggestion: gap.suggestion,
      gap,
      missing: missingTerms,
      sentCvText,
      vocabulary,
    });
    if (verdict.ok) return gap;
    discarded += 1;
    return { ...gap, suggestion: null };
  });
  return { gaps: checked, discarded };
}

export type AnalyseGapsInput = {
  readonly inputs: AnalysisInputs;
  // The Missing keywords from the server's own phase-1 analysis, in order.
  readonly missingTerms: readonly string[];
  // `features.rewording`, read by the caller. Off (the default) asks for no
  // suggestion and returns none.
  readonly rewording?: boolean;
  // The Keyword vocabulary, so a suggestion that names a Missing keyword by an
  // alias is found too (FR-17). Without it a keyword is found by its own words.
  readonly vocabulary?: Vocabulary;
};

type RunOptions = Parameters<typeof runAi>[2];

/**
 * One `runAi` call for the Gap analysis (FR-13, FR-14). With no Missing
 * keyword there is nothing to judge and no request is made. Every `AiFailure`
 * passes through. After the structure step every Rewordable citation is
 * checked against the sent CV text (FR-15), then every suggestion against the
 * Missing list and the cited CV entry (FR-17); downgrades and discards are
 * logged as counts. `options` is the test seam of `runAi`.
 */
export async function analyseGaps(
  input: AnalyseGapsInput,
  ctx: AiContext,
  options?: RunOptions,
): Promise<Result<{ gaps: Gap[]; meta: AiResultMeta | null }, AiFailure>> {
  const { inputs, missingTerms } = input;
  const rewording = input.rewording === true;
  if (missingTerms.length === 0) return ok({ gaps: [], meta: null });

  // No job title, employer or tone: the Gaps lookup key is the CV and the ad
  // alone (AD-15).
  const run = await runAi(
    {
      task: GAPS_TASK,
      cvText: inputs.cvText,
      jobAd: inputs.jobAd,
      promptVersion: PROMPT_VERSION,
      buildPrompt: gapsPromptBuilder({
        jobAd: inputs.jobAd,
        missingTerms,
        rewording,
      }),
      schema: gapsOutputSchema,
    },
    ctx,
    options,
  );
  if (!run.ok) return err(run.error);

  const structured = structureGaps(
    missingTerms,
    run.value.data.gaps.flatMap((item) => {
      // `gapsOutputSchema` turns a malformed item into one with an empty
      // keyword and kind. It is dropped here, so it never takes the place of a
      // usable item for the same keyword (the first usable item wins).
      const parsed = itemSchema.safeParse(item);
      return parsed.success &&
        parsed.data.keyword !== "" &&
        parsed.data.kind !== ""
        ? [parsed.data]
        : [];
    }),
    rewording,
  );
  // Citations are checked against the CV text that was sent, not the raw one.
  const cited = checkGapCitations(structured, run.value.sentCvText);
  const { gaps, discarded } = checkGapSuggestions(
    cited.gaps,
    missingTerms,
    run.value.sentCvText,
    input.vocabulary,
  );
  // Counts only (AD-14): never a keyword, a citation, a suggestion or CV text.
  log({ kind: "gaps", downgraded: cited.downgraded, discarded });
  return ok({ gaps, meta: run.value.meta });
}

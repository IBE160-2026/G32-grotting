import { eq } from "drizzle-orm";
import { type AiContext, KEYWORDS_TASK, runAi } from "@/modules/ai";
import type { KeywordSource } from "@/modules/keywords/contracts";
import {
  extractKeywords,
  type Keyword,
  proposeKeywords,
} from "@/modules/keywords/core";
import { ok, type Result } from "@/shared/core/result";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { getConfig } from "@/shared/server/config";
import { contentHash } from "@/shared/server/content-hash";
import { getDb } from "@/shared/server/db";
import { log } from "@/shared/server/log";
import {
  keywordsOutputSchema,
  keywordsPromptBuilder,
  MAX_PROPOSED,
  MIN_KEYWORDS,
  PROMPT_VERSION,
} from "./prompts/keywords";
import { keywordLists } from "./schema";

export type ResolvedKeywords = {
  readonly keywords: Keyword[];
  readonly keywordSource: KeywordSource;
};

type RunOptions = Parameters<typeof runAi>[2];

export type ResolveOptions = {
  readonly vocabulary: Vocabulary;
  // Who asks and what they have accepted. Without it no AI request is made and
  // only a saved list is read: phase 2 recomputes phase 1 this way, so it never
  // spends a request and finds the list phase 1 saved.
  readonly ai?: { readonly ctx: AiContext; readonly run?: RunOptions };
  // A test seam; the default is `config.features.keywordFallback`.
  readonly keywordFallback?: boolean;
};

function codeList(
  jobAd: string,
  vocabulary: Vocabulary,
  keywordSource: "code" | "code-fallback",
): Result<ResolvedKeywords, "TOO_FEW_KEYWORDS"> {
  const extracted = extractKeywords(jobAd, vocabulary);
  if (!extracted.ok) return extracted;
  return ok({ keywords: extracted.value, keywordSource });
}

// The saved list for a hash, with its positions found again in the ad by the
// engine that is current now. Too few terms left means no usable list.
function usable(
  jobAd: string,
  terms: readonly string[],
  vocabulary: Vocabulary,
): Keyword[] | undefined {
  const keywords = proposeKeywords(jobAd, terms, vocabulary);
  return keywords.length >= MIN_KEYWORDS ? keywords : undefined;
}

async function readSaved(
  hash: string,
  jobAd: string,
  vocabulary: Vocabulary,
): Promise<Keyword[] | undefined> {
  const db = await getDb();
  const [row] = await db
    .select({ keywords: keywordLists.keywords })
    .from(keywordLists)
    .where(eq(keywordLists.contentHash, hash))
    .limit(1);
  return row === undefined
    ? undefined
    : usable(jobAd, row.keywords, vocabulary);
}

// One request for the list (FR-5b, AD-13). Every proposed term must be found in
// the ad or it is dropped; the list is saved under the ad's hash, and when two
// requests race the first saved list is the one both use. Anything that stops a
// usable saved list from existing (notice, cap, Test-mode miss, failure, too few
// terms) gives `undefined`, and the caller falls back to code.
async function proposeAndSave(
  hash: string,
  jobAd: string,
  vocabulary: Vocabulary,
  ai: NonNullable<ResolveOptions["ai"]>,
): Promise<Keyword[] | undefined> {
  const run = await runAi(
    {
      task: KEYWORDS_TASK,
      // The CV is never part of this request.
      jobAd,
      promptVersion: PROMPT_VERSION,
      buildPrompt: keywordsPromptBuilder({ jobAd }),
      schema: keywordsOutputSchema,
    },
    ai.ctx,
    ai.run,
  );
  if (!run.ok) return undefined;

  const proposed = proposeKeywords(
    jobAd,
    run.value.data.keywords.slice(0, MAX_PROPOSED),
    vocabulary,
  );
  if (proposed.length < MIN_KEYWORDS) return undefined;

  const db = await getDb();
  const row = {
    contentHash: hash,
    keywords: proposed.map(({ term }) => term),
    promptVersion: run.value.meta.promptVersion,
    provider: run.value.meta.provider,
    model: run.value.meta.model,
  };
  await db.insert(keywordLists).values(row).onConflictDoNothing();
  const saved = await readSaved(hash, jobAd, vocabulary);
  if (saved !== undefined) return saved;
  // A row is there that the engine no longer finds a usable list in (the
  // vocabulary changed since it was saved): replace it, or every run for this
  // ad would pay for a request and still fall back.
  await db
    .update(keywordLists)
    .set(row)
    .where(eq(keywordLists.contentHash, hash));
  return readSaved(hash, jobAd, vocabulary);
}

/**
 * The only way Keywords reach `match` (AD-5). With `keywordFallback` off, the
 * list is the code-only one (`code`). With it on (FR-5b): a saved list for the
 * ad's hash is reused (`saved`); else, when the caller may ask AI, one request
 * proposes the list, which is checked against the ad and saved (`saved`); else
 * the code-only list is used and marked `code-fallback`. A failing database
 * never breaks the score: it counts as no saved list. `TOO_FEW_KEYWORDS` only
 * when the list that is left has under 3 Keywords.
 */
export async function resolveKeywords(
  jobAd: string,
  options: ResolveOptions,
): Promise<Result<ResolvedKeywords, "TOO_FEW_KEYWORDS">> {
  const { vocabulary } = options;
  const fallbackOn =
    options.keywordFallback ?? getConfig().features.keywordFallback;
  if (!fallbackOn) return codeList(jobAd, vocabulary, "code");

  const hash = contentHash(jobAd);
  try {
    const saved = await readSaved(hash, jobAd, vocabulary);
    if (saved !== undefined) {
      return ok({ keywords: saved, keywordSource: "saved" });
    }
    if (options.ai !== undefined) {
      const proposed = await proposeAndSave(
        hash,
        jobAd,
        vocabulary,
        options.ai,
      );
      if (proposed !== undefined) {
        return ok({ keywords: proposed, keywordSource: "saved" });
      }
    }
  } catch (error) {
    // The list could not be read or saved: use code, as for any failed request.
    // Logged by name only, so a broken database does not pass as «less precise».
    log({
      kind: "error",
      code: "UNEXPECTED",
      errorName: error instanceof Error ? error.name : "Error",
      route: "keywords/resolve",
    });
  }
  return codeList(jobAd, vocabulary, "code-fallback");
}

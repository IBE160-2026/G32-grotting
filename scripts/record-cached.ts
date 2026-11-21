import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { GAPS_TASK } from "@/modules/ai/core/lookup-key";
import { stripContactDetails } from "@/modules/ai/core/strip-contact";
import type { AiAdapterPort } from "@/modules/ai/server/adapters/factory";
import {
  AiProviderError,
  createLiveAdapter,
} from "@/modules/ai/server/adapters/live";
import {
  PROMPT_VERSION as GAPS_PROMPT_VERSION,
  gapsOutputSchema,
  gapsPromptBuilder,
} from "@/modules/gaps/server/prompts/gaps";
import {
  extractKeywords,
  type Keyword,
  proposeKeywords,
  splitParagraphs,
} from "@/modules/keywords/core";
import {
  PROMPT_VERSION as KEYWORDS_PROMPT_VERSION,
  keywordsOutputSchema,
  keywordsPromptBuilder,
  MAX_PROPOSED,
  MIN_KEYWORDS,
} from "@/modules/keywords/server/prompts/keywords";
import { TONES, type Tone } from "@/modules/letter/contracts";
import {
  letterPromptBuilder,
  PROMPT_VERSION,
} from "@/modules/letter/server/prompts/letter";
import { analyse } from "@/modules/match";
import { answerKeySchema, fixtureMetaSchema } from "@/shared/core/answer-key";
import { canon } from "@/shared/core/canon";
import { type Vocabulary, vocabularySchema } from "@/shared/core/vocabulary";

// Records the Cached responses of one Fixture (Story 3.5, FR-27, AD-15): one
// live request per Tone, written raw, before `normaliseLetter` or any guard, to
// `data/fixtures/<id>/cached/letter-<tone>.json`; with `--keywords` one request
// for the Keyword list (Story 3.11, FR-5b), written raw to `cached/keywords.json`.
// With `--gaps` one request for the Gaps (Story 4.3, FR-13) and, with rewording
// asked for, one suggestion per Rewordable gap (Story 5.1, FR-16), written raw
// to `cached/gaps.json`.
// `--gaps` reads `cached/keywords.json` (phase 1 in Test mode), so record the
// Keyword list first; a `keywords.json` recorded after `--gaps` needs `--gaps`
// again.
// This is the only writer of `cached/`; a Cached file is never edited by hand.
// It is run by Helene with her own key from `.env`; no test ever runs it live.
// Usage: npm run fixtures:record -- <fixture-id> [--tone Formell|Personlig|Direkte | --keywords | --gaps]

const FIXTURES_DIR = fileURLToPath(
  new URL("../data/fixtures", import.meta.url),
);
const VOCABULARY_FILE = fileURLToPath(
  new URL("../data/vocabulary/nb.json", import.meta.url),
);
const REQUEST_TIMEOUT_MS = 90_000;

// What the AI must return, as `generateLetter` asks for it.
const outputSchema = z.object({ text: z.string() });

// A problem with how the script was started. The message names the setting and
// never its value.
export class RecordUsageError extends Error {}

export type RecordArgs = {
  readonly fixtureId: string;
  // Every Tone when undefined: a rerun of one Tone names it.
  readonly tone: Tone | undefined;
  // Only the Keyword list (FR-5b), and no Letter.
  readonly keywords: boolean;
  // Only the Gaps (FR-13), and no Letter.
  readonly gaps: boolean;
};

export function parseArgs(argv: readonly string[]): RecordArgs {
  let fixtureId: string | undefined;
  let tone: Tone | undefined;
  let keywords = false;
  let gaps = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tone") {
      const value = argv[++i];
      const found = TONES.find((candidate) => candidate === value);
      if (found === undefined) {
        throw new RecordUsageError(`--tone takes one of ${TONES.join(", ")}`);
      }
      tone = found;
    } else if (arg === "--keywords") {
      keywords = true;
    } else if (arg === "--gaps") {
      gaps = true;
    } else if (arg !== undefined && !arg.startsWith("--")) {
      if (fixtureId !== undefined) {
        throw new RecordUsageError("Give one Fixture id");
      }
      fixtureId = arg;
    } else {
      throw new RecordUsageError(`Unknown argument ${arg}`);
    }
  }
  if (fixtureId === undefined) {
    throw new RecordUsageError("Usage: record-cached <fixture-id>");
  }
  if (keywords && tone !== undefined) {
    throw new RecordUsageError("--keywords and --tone cannot be combined");
  }
  if (gaps && (keywords || tone !== undefined)) {
    throw new RecordUsageError("--gaps cannot be combined with another task");
  }
  return { fixtureId, tone, keywords, gaps };
}

type Env = Readonly<Record<string, string | undefined>>;

export type RecordOptions = {
  readonly args: RecordArgs;
  readonly env: Env;
  readonly fixturesDir?: string;
  readonly now?: Date;
  // A test seam: the adapter to ask. Without it the live adapter is built from
  // AI_PROVIDER, AI_MODEL and AI_API_KEY.
  readonly adapter?: AiAdapterPort;
};

const setting = (env: Env, name: string) =>
  env[name] === undefined || env[name] === "" ? undefined : env[name];

// The same test the config uses: a test run never reaches a provider.
const isTestRun = (env: Env) =>
  setting(env, "VITEST") !== undefined ||
  setting(env, "E2E") === "1" ||
  setting(env, "TEST_MODE") === "true";

function liveAdapter(env: Env): AiAdapterPort {
  const missing = ["AI_PROVIDER", "AI_MODEL", "AI_API_KEY"].filter(
    (name) => setting(env, name) === undefined,
  );
  if (missing.length > 0) {
    throw new RecordUsageError(`Missing setting: ${missing.join(", ")}`);
  }
  return createLiveAdapter({
    provider: setting(env, "AI_PROVIDER"),
    model: setting(env, "AI_MODEL"),
    apiKey: setting(env, "AI_API_KEY"),
  });
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;

// The one request for the Keyword list. The prompt holds the Job ad and nothing
// else: the CV is never part of it. The answer is written raw, before
// `proposeKeywords` checks it against the ad.
async function recordKeywords(
  adapter: AiAdapterPort,
  folder: string,
  jobAd: string,
  now: Date | undefined,
): Promise<string> {
  const generated = await adapter.generate({
    prompt: keywordsPromptBuilder({ jobAd })(""),
    lookupKey: "record-cached",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    maxRetries: 0,
    schema: keywordsOutputSchema,
  });
  const parsed = keywordsOutputSchema.safeParse(generated.output);
  if (!parsed.success || parsed.data.keywords.length === 0) {
    throw new Error("The answer had no keywords");
  }
  const content = {
    data: { keywords: parsed.data.keywords },
    meta: {
      source: "live",
      provider: adapter.provider,
      model: adapter.model,
      promptVersion: KEYWORDS_PROMPT_VERSION,
      createdAt: (now ?? new Date()).toISOString(),
    },
  };
  await mkdir(join(folder, "cached"), { recursive: true });
  const file = join(folder, "cached", "keywords.json");
  await writeFile(
    file,
    `${JSON.stringify(content, null, 2)}
`,
    "utf8",
  );
  return file;
}

// The Missing keywords phase 1 finds for a Fixture in Test mode, in list order:
// the Keywords come from the saved AI Keyword list (the Cached
// `keywords.json`, checked against the ad as `resolveKeywords` does) and, when
// that is no usable list, from code alone. This is the list the Gaps route asks
// about in the default Test-mode flow. Pure apart from reading the file.
export async function testModeMissingTerms(
  folder: string,
  cvText: string,
  jobAd: string,
  vocabulary: Vocabulary,
): Promise<string[]> {
  let keywords: Keyword[] | undefined;
  const file = join(folder, "cached", "keywords.json");
  if (existsSync(file)) {
    const saved = z
      .object({ data: keywordsOutputSchema })
      .safeParse(JSON.parse(await readFile(file, "utf8")));
    if (saved.success) {
      // Checked against the ad when proposed, and again when read back.
      const proposed = proposeKeywords(
        jobAd,
        saved.data.data.keywords.slice(0, MAX_PROPOSED),
        vocabulary,
      );
      const usable =
        proposed.length < MIN_KEYWORDS
          ? []
          : proposeKeywords(
              jobAd,
              proposed.map(({ term }) => term),
              vocabulary,
            );
      if (usable.length >= MIN_KEYWORDS) keywords = usable;
    }
  }
  if (keywords === undefined) {
    const extracted = extractKeywords(jobAd, vocabulary);
    if (!extracted.ok) return [];
    keywords = extracted.value;
  }
  const analysis = analyse(cvText, keywords, vocabulary, {
    keywordSource: "saved",
    adParagraphs: splitParagraphs(jobAd).length,
  });
  return analysis.missing.map(({ term }) => term);
}

const keyOf = (term: string) => canon(term).toLowerCase();

/**
 * The words one Gaps request asks about: the Answer key's Missing list first,
 * in its order, then every Missing keyword the app's phase 1 finds in Test mode
 * that is not already there, with no duplicates (case and white space do not
 * count, as in the structure step). The Answer key is the oracle for G2 and
 * stays first; the extra words make every Missing keyword the app shows in Test
 * mode a real Gap instead of the template.
 */
export function gapsMissingList(
  answerKeyMissing: readonly string[],
  testModeMissing: readonly string[],
): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const term of [...answerKeyMissing, ...testModeMissing]) {
    const key = keyOf(term);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);
    list.push(term);
  }
  return list;
}

// The one request for the Gaps. The Missing keywords are the Answer key's, in
// its order, followed by the Missing keywords of phase 1 in Test mode (see
// `gapsMissingList`). The Answer key is the oracle for what is missing, and for
// the held out Fixture the code-only list is not (the known FR-5b failure).
// Only the keywords are read from it, never its Gap verdicts or its
// must-never-suggest list. The prompt is the one `analyseGaps` builds with
// rewording on (FR-16), from the stripped CV. The answer is written raw, before
// the structure step and FR-15, so the tests judge what the model really wrote.
// One request, no retry: a failure writes nothing.
async function recordGaps(
  adapter: AiAdapterPort,
  folder: string,
  fixtureId: string,
  cvText: string,
  jobAd: string,
  vocabulary: Vocabulary,
  now: Date | undefined,
): Promise<string> {
  const answerKey = answerKeySchema.parse(
    JSON.parse(await readFile(join(folder, "answer-key.json"), "utf8")),
  );
  if (answerKey.keywords.missing.length === 0) {
    throw new RecordUsageError(`${fixtureId}: no Missing keyword to judge`);
  }
  // Everything is read before the one request: a problem here costs nothing.
  const missingTerms = gapsMissingList(
    answerKey.keywords.missing,
    await testModeMissingTerms(folder, cvText, jobAd, vocabulary),
  );
  // Contact details never go to a provider (FR-26).
  const prompt = gapsPromptBuilder({ jobAd, missingTerms, rewording: true })(
    stripContactDetails(cvText),
  );
  const generated = await adapter.generate({
    task: GAPS_TASK,
    prompt,
    lookupKey: "record-cached",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    maxRetries: 0,
    schema: gapsOutputSchema,
  });
  const parsed = gapsOutputSchema.safeParse(generated.output);
  if (!parsed.success) {
    throw new Error("The answer had no list of gaps");
  }
  // The adapter's output as it came back, not the parsed copy.
  const content = {
    data: generated.output,
    meta: {
      source: "live",
      provider: adapter.provider,
      model: adapter.model,
      promptVersion: GAPS_PROMPT_VERSION,
      createdAt: (now ?? new Date()).toISOString(),
    },
  };
  await mkdir(join(folder, "cached"), { recursive: true });
  const file = join(folder, "cached", "gaps.json");
  await writeFile(
    file,
    `${JSON.stringify(content, null, 2)}
`,
    "utf8",
  );
  return file;
}

/**
 * Records the Cached Letters, or with `--keywords` the Cached Keyword list, or
 * with `--gaps` the Cached Gaps, and returns the files written. A Letter
 * request is the one `generateLetter` makes: the same prompt, from the
 * stripped CV and the Matched keywords of the phase-1 analysis. Settings are checked before
 * anything is read or written; a failed request writes nothing for its Tone.
 */
export async function recordCached(options: RecordOptions): Promise<string[]> {
  const { args, env } = options;
  if (isTestRun(env)) {
    throw new RecordUsageError(
      "Recording is not allowed in a test run or in Test mode",
    );
  }
  if (!SAFE_ID.test(args.fixtureId)) {
    throw new RecordUsageError("The Fixture id is not a Fixture folder name");
  }
  const adapter = options.adapter ?? liveAdapter(env);

  const folder = join(options.fixturesDir ?? FIXTURES_DIR, args.fixtureId);
  if (!existsSync(folder)) {
    throw new RecordUsageError(`No Fixture ${args.fixtureId}`);
  }
  const [cvText, jobAd, metaText, vocabularyText] = await Promise.all([
    readFile(join(folder, "cv.txt"), "utf8"),
    readFile(join(folder, "ad.txt"), "utf8"),
    readFile(join(folder, "meta.json"), "utf8"),
    readFile(VOCABULARY_FILE, "utf8"),
  ]);
  const meta = fixtureMetaSchema.parse(JSON.parse(metaText));
  const vocabulary = vocabularySchema.parse(JSON.parse(vocabularyText));

  if (args.gaps) {
    return [
      await recordGaps(
        adapter,
        folder,
        args.fixtureId,
        cvText,
        jobAd,
        vocabulary,
        options.now,
      ),
    ];
  }
  if (args.keywords) {
    return [await recordKeywords(adapter, folder, jobAd, options.now)];
  }

  // Phase 1 with the code-only list, as the Letters were recorded before the
  // saved lists existed: the Letter prompt names the Matched keywords.
  const extracted = extractKeywords(jobAd, vocabulary);
  if (!extracted.ok) {
    throw new RecordUsageError(`${args.fixtureId}: too few Keywords in ad.txt`);
  }
  const analysis = analyse(cvText, extracted.value, vocabulary, {
    keywordSource: "code",
    adParagraphs: splitParagraphs(jobAd).length,
  });
  const matchedTerms = analysis.matched.map(({ term }) => term);

  // Contact details never go to a provider (FR-26).
  const sentCvText = stripContactDetails(cvText);
  const tones = args.tone === undefined ? TONES : [args.tone];
  const written: string[] = [];
  for (const tone of tones) {
    const prompt = letterPromptBuilder({
      jobAd,
      jobTitle: meta.jobTitle,
      employer: meta.employer,
      tone,
      matchedTerms,
    })(sentCvText);
    const generated = await adapter.generate({
      prompt,
      lookupKey: "record-cached",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      maxRetries: 0,
      schema: outputSchema,
    });
    const parsed = outputSchema.safeParse(generated.output);
    if (!parsed.success) {
      throw new Error(`The answer for ${tone} had no text`);
    }
    const content = {
      data: { text: parsed.data.text },
      meta: {
        source: "live",
        provider: adapter.provider,
        model: adapter.model,
        promptVersion: PROMPT_VERSION,
        createdAt: (options.now ?? new Date()).toISOString(),
      },
    };
    await mkdir(join(folder, "cached"), { recursive: true });
    const file = join(folder, "cached", `letter-${tone.toLowerCase()}.json`);
    await writeFile(file, `${JSON.stringify(content, null, 2)}\n`, "utf8");
    written.push(file);
  }
  return written;
}

function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  try {
    // tsx does not read `.env`; Node does, and never overrides a set variable.
    if (existsSync(".env")) process.loadEnvFile(".env");
    const files = await recordCached({
      args: parseArgs(process.argv.slice(2)),
      env: process.env,
    });
    for (const file of files) process.stdout.write(`Wrote ${file}\n`);
  } catch (error) {
    // The message of a usage error names a setting, never a value. A provider
    // failure is reported by its code (HTTP_404, ...) and anything else by its
    // type only: a provider message could hold content.
    const reason =
      error instanceof RecordUsageError
        ? error.message
        : error instanceof AiProviderError
          ? `Recording failed (${error.code})`
          : `Recording failed (${error instanceof Error ? error.name : "unknown error"})`;
    process.stderr.write(`${reason}\n`);
    process.exitCode = 1;
  }
}

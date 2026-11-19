import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { stripContactDetails } from "@/modules/ai/core/strip-contact";
import type { AiAdapterPort } from "@/modules/ai/server/adapters/factory";
import {
  AiProviderError,
  createLiveAdapter,
} from "@/modules/ai/server/adapters/live";
import { splitParagraphs } from "@/modules/keywords/core";
import { resolveKeywords } from "@/modules/keywords/server/keyword-source";
import { TONES, type Tone } from "@/modules/letter/contracts";
import {
  letterPromptBuilder,
  PROMPT_VERSION,
} from "@/modules/letter/server/prompts/letter";
import { analyse } from "@/modules/match";
import { fixtureMetaSchema } from "@/shared/core/answer-key";
import { vocabularySchema } from "@/shared/core/vocabulary";

// Records the Cached Letters of one Fixture (Story 3.5, FR-27, AD-15): one live
// request per Tone, written raw, before `normaliseLetter` or any guard, to
// `data/fixtures/<id>/cached/letter-<tone>.json`. This is the only writer of
// `cached/`; a Cached file is never edited by hand. It is run by Helene with
// her own key from `.env`; no test ever runs it live.
// Usage: npm run fixtures:record -- <fixture-id> [--tone Formell|Personlig|Direkte]

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
};

export function parseArgs(argv: readonly string[]): RecordArgs {
  let fixtureId: string | undefined;
  let tone: Tone | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tone") {
      const value = argv[++i];
      const found = TONES.find((candidate) => candidate === value);
      if (found === undefined) {
        throw new RecordUsageError(`--tone takes one of ${TONES.join(", ")}`);
      }
      tone = found;
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
  return { fixtureId, tone };
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

/**
 * Records the Cached Letters and returns the files written. The request is the
 * one `generateLetter` makes: the same prompt, from the stripped CV and the
 * Matched keywords of the phase-1 analysis. Settings are checked before
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

  // Phase 1 as `analyseInputs` does it, so the prompt names the Keywords the
  // app would name.
  const resolved = resolveKeywords(jobAd, { vocabulary });
  if (!resolved.ok) {
    throw new RecordUsageError(`${args.fixtureId}: too few Keywords in ad.txt`);
  }
  const analysis = analyse(cvText, resolved.value.keywords, vocabulary, {
    keywordSource: resolved.value.keywordSource,
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

import { existsSync, realpathSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { stripContactDetails } from "@/modules/ai/core/strip-contact";
import type { AiAdapterPort } from "@/modules/ai/server/adapters/factory";
import {
  AiProviderError,
  createLiveAdapter,
} from "@/modules/ai/server/adapters/live";
import { createMockAdapter } from "@/modules/ai/server/adapters/mock";
import { answerKeySchema, fixtureMetaSchema } from "@/shared/core/answer-key";
import { osloDay } from "@/shared/core/time";
import {
  type GapOutput,
  gapPrompt,
  gapSchema,
  type LetterOutput,
  letterPrompt,
  letterSchema,
} from "./bake-off/prompts";
import {
  type Price,
  type RequestRecord,
  renderResults,
  type Task,
} from "./bake-off/results";

// The provider Bake-off (Story 3.3, PRD §8.2). It asks every contender for a
// Letter and a Gap analysis on every Fixture and saves the outputs, token
// counts and cost for hand scoring. It is run by Helene with her own keys; no
// test ever runs it live. Usage: see docs/qa/bake-off-runbook.md.

// A contender has an id: "anthropic", "openai" or "openrouter:<model>". The id
// names its price flags, its label in results.md and its output folder.
type Provider = "anthropic" | "openai" | "openrouter";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";
const OPENROUTER_PREFIX = "openrouter:";
const REQUEST_TIMEOUT_MS = 90_000;
const FIXTURES_DIR = fileURLToPath(
  new URL("../data/fixtures", import.meta.url),
);
const LIVE_OUT_ROOT = fileURLToPath(
  new URL("../docs/qa/bake-off", import.meta.url),
);

// A problem with how the script was started. The message names the setting and
// never its value.
export class BakeOffUsageError extends Error {}

export type Prices = Readonly<Record<string, number>>;

export type BakeOffArgs = {
  readonly dry: boolean;
  readonly out: string | undefined;
  // USD per million tokens, by contender id.
  readonly priceIn: Prices;
  readonly priceOut: Prices;
};

const isContenderId = (value: string): boolean =>
  value === "anthropic" ||
  value === "openai" ||
  (value.startsWith(OPENROUTER_PREFIX) &&
    value.length > OPENROUTER_PREFIX.length);

// The id splits on the last "=", so an id may hold one.
function parsePrice(
  flag: string,
  value: string | undefined,
  into: Record<string, number>,
): void {
  const text = value ?? "";
  const at = text.lastIndexOf("=");
  const name = at < 0 ? "" : text.slice(0, at);
  const amount = at < 0 ? "" : text.slice(at + 1);
  const number = Number(amount);
  if (
    !isContenderId(name) ||
    amount === "" ||
    !Number.isFinite(number) ||
    number < 0
  ) {
    throw new BakeOffUsageError(
      `${flag} takes <anthropic|openai|openrouter:<model>>=<USD per million tokens>`,
    );
  }
  into[name] = number;
}

export function parseArgs(argv: readonly string[]): BakeOffArgs {
  let dry = false;
  let out: string | undefined;
  const priceIn: Record<string, number> = {};
  const priceOut: Record<string, number> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry") dry = true;
    else if (arg === "--out") {
      out = argv[++i];
      if (out === undefined || out.startsWith("--")) {
        throw new BakeOffUsageError("--out needs a folder");
      }
    } else if (arg === "--price-in") parsePrice(arg, argv[++i], priceIn);
    else if (arg === "--price-out") parsePrice(arg, argv[++i], priceOut);
    else throw new BakeOffUsageError(`Unknown argument ${arg}`);
  }
  return { dry, out, priceIn, priceOut };
}

export type Contender = {
  readonly id: string;
  readonly provider: Provider;
  readonly model: string;
  readonly apiKey: string | undefined;
  readonly price: Price | undefined;
  // The output folder under the run's folder: the id without path separators.
  readonly folder: string;
};

type Env = Readonly<Record<string, string | undefined>>;

export const folderName = (id: string): string => id.replace(/[/\\:]/g, "-");

// Comma-separated model ids: trimmed, empty items dropped, duplicates refused.
function parseModels(value: string | undefined): string[] {
  const models = (value ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model !== "");
  if (new Set(models).size !== models.length) {
    throw new BakeOffUsageError(
      "BAKE_OFF_OPENROUTER_MODELS lists the same model twice",
    );
  }
  return models;
}

// Everything the run needs, checked before anything is written.
export function resolveContenders(args: BakeOffArgs, env: Env): Contender[] {
  const read = (name: string) =>
    env[name] === undefined || env[name] === "" ? undefined : env[name];
  const anthropicKey = read("BAKE_OFF_ANTHROPIC_KEY");
  const anthropicModel = read("BAKE_OFF_ANTHROPIC_MODEL");
  const openaiKey = read("BAKE_OFF_OPENAI_KEY");
  const openaiModel = read("BAKE_OFF_OPENAI_MODEL");
  const openrouterKey = read("BAKE_OFF_OPENROUTER_KEY");
  const openrouterModels = parseModels(read("BAKE_OFF_OPENROUTER_MODELS"));

  if (!args.dry) {
    // A key without its model, or a model without its key, is a typo or a
    // forgotten setting: a paid run must not quietly be a smaller comparison.
    const missing = [
      anthropicKey === undefined && anthropicModel !== undefined
        ? "BAKE_OFF_ANTHROPIC_KEY"
        : null,
      openaiKey === undefined && openaiModel !== undefined
        ? "BAKE_OFF_OPENAI_KEY"
        : null,
      openaiKey !== undefined && openaiModel === undefined
        ? "BAKE_OFF_OPENAI_MODEL"
        : null,
      openrouterKey !== undefined && openrouterModels.length === 0
        ? "BAKE_OFF_OPENROUTER_MODELS"
        : null,
      openrouterKey === undefined && openrouterModels.length > 0
        ? "BAKE_OFF_OPENROUTER_KEY"
        : null,
    ].filter((name) => name !== null);
    if (missing.length > 0) {
      throw new BakeOffUsageError(`Missing setting: ${missing.join(", ")}`);
    }
    if (
      anthropicKey === undefined &&
      openaiKey === undefined &&
      openrouterKey === undefined
    ) {
      throw new BakeOffUsageError(
        "No contender configured. Set BAKE_OFF_ANTHROPIC_KEY, or BAKE_OFF_OPENAI_KEY with BAKE_OFF_OPENAI_MODEL, or BAKE_OFF_OPENROUTER_KEY with BAKE_OFF_OPENROUTER_MODELS",
      );
    }
  }

  const price = (id: string): Price | undefined => {
    const inPerMillion = args.priceIn[id];
    const outPerMillion = args.priceOut[id];
    return inPerMillion === undefined || outPerMillion === undefined
      ? undefined
      : { inPerMillion, outPerMillion };
  };
  const make = (
    id: string,
    provider: Provider,
    model: string,
    apiKey: string | undefined,
  ): Contender => ({
    id,
    provider,
    model,
    apiKey,
    price: price(id),
    folder: folderName(id),
  });

  const contenders: Contender[] = [];
  // A dry run plans all three kinds on the mock adapter; a live run plans what
  // has a key.
  if (args.dry || anthropicKey !== undefined) {
    contenders.push(
      make(
        "anthropic",
        "anthropic",
        anthropicModel ?? DEFAULT_ANTHROPIC_MODEL,
        anthropicKey,
      ),
    );
  }
  if (args.dry || openaiKey !== undefined) {
    contenders.push(
      make("openai", "openai", openaiModel ?? "mock-1", openaiKey),
    );
  }
  if (args.dry || openrouterKey !== undefined) {
    const models = openrouterModels.length > 0 ? openrouterModels : ["mock-1"];
    for (const model of models) {
      contenders.push(
        make(
          `${OPENROUTER_PREFIX}${model}`,
          "openrouter",
          model,
          openrouterKey,
        ),
      );
    }
  }

  // Folders must differ (openrouter:a/b and openrouter:a-b would share one).
  // Compared lowercased: Windows and macOS treat a/X and a/x as one folder.
  const folders = new Set(contenders.map((c) => c.folder.toLowerCase()));
  if (folders.size !== contenders.length) {
    throw new BakeOffUsageError(
      "Two contenders would write to the same folder; rename or drop one model in BAKE_OFF_OPENROUTER_MODELS",
    );
  }
  // A price for a contender that is not planned is a typo or a missing setting.
  const planned = new Set(contenders.map((c) => c.id));
  const priced = new Set([
    ...Object.keys(args.priceIn),
    ...Object.keys(args.priceOut),
  ]);
  for (const id of priced) {
    if (planned.has(id)) continue;
    const setting =
      id === "anthropic"
        ? "BAKE_OFF_ANTHROPIC_KEY"
        : id === "openai"
          ? "BAKE_OFF_OPENAI_KEY"
          : openrouterKey === undefined
            ? "BAKE_OFF_OPENROUTER_KEY"
            : "BAKE_OFF_OPENROUTER_MODELS";
    throw new BakeOffUsageError(
      `A price was given for ${id}, which is not planned; check ${setting}`,
    );
  }
  return contenders;
}

type Fixture = {
  readonly id: string;
  readonly cvText: string;
  readonly jobAd: string;
  readonly jobTitle: string;
  readonly employer: string;
  readonly missingKeywords: readonly string[] | undefined;
};

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return undefined;
  }
}

// Every Fixture folder (not starting with "_") that has cv.txt and ad.txt.
export async function loadFixtures(dir: string): Promise<Fixture[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const fixtures: Fixture[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const folder = join(dir, entry.name);
    const [cvText, jobAd] = await Promise.all([
      readFile(join(folder, "cv.txt"), "utf8").catch(() => undefined),
      readFile(join(folder, "ad.txt"), "utf8").catch(() => undefined),
    ]);
    if (cvText === undefined || jobAd === undefined) continue;
    const meta = fixtureMetaSchema.safeParse(
      await readJson(join(folder, "meta.json")),
    );
    const key = answerKeySchema.safeParse(
      await readJson(join(folder, "answer-key.json")),
    );
    fixtures.push({
      id: entry.name,
      cvText,
      jobAd,
      jobTitle: meta.success ? meta.data.jobTitle : "stillingen",
      employer: meta.success ? meta.data.employer : "arbeidsgiveren",
      missingKeywords: key.success ? key.data.keywords.missing : undefined,
    });
  }
  return fixtures.sort((a, b) => a.id.localeCompare(b.id));
}

const SAMPLE_LETTER: LetterOutput = {
  text: "Hei\n\nDette er et prøvesvar fra mock-adapteret.\n\n{{SIGNATUR}}",
};
const SAMPLE_GAP: GapOutput = {
  gaps: [
    {
      keyword: "eksempel",
      kind: "real",
      explanation: "Prøvesvar fra mock-adapteret.",
      evidence: null,
      suggestion: null,
    },
  ],
};

export type AdapterFor = (contender: Contender, task: Task) => AiAdapterPort;

const defaultAdapterFor =
  (dry: boolean): AdapterFor =>
  (contender, task) =>
    dry
      ? createMockAdapter({
          respond: () => (task === "letter" ? SAMPLE_LETTER : SAMPLE_GAP),
        })
      : createLiveAdapter({
          provider: contender.provider,
          model: contender.model,
          apiKey: contender.apiKey,
        });

export type BakeOffOptions = {
  readonly args: BakeOffArgs;
  readonly env: Env;
  readonly fixturesDir?: string;
  readonly now?: Date;
  // A test seam: the adapter for a contender and task.
  readonly adapterFor?: AdapterFor;
};

async function request<T>(
  adapter: AiAdapterPort,
  prompt: string,
  schema: z.ZodType<T>,
): Promise<
  | {
      ok: true;
      data: T;
      inputTokens: number | null;
      outputTokens: number | null;
      durationMs: number;
    }
  | {
      ok: false;
      errorCode: string;
      inputTokens: null;
      outputTokens: null;
      durationMs: number;
    }
> {
  const started = Date.now();
  const failed = (errorCode: string) => ({
    ok: false as const,
    errorCode,
    inputTokens: null,
    outputTokens: null,
    durationMs: Date.now() - started,
  });
  try {
    const generated = await adapter.generate({
      prompt,
      lookupKey: "bake-off",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      maxRetries: 0,
      schema,
    });
    const parsed = schema.safeParse(generated.output);
    if (!parsed.success) return failed("SCHEMA_MISMATCH");
    return {
      ok: true,
      data: parsed.data,
      ...generated.usage,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    // Only the code is kept. The message is never read.
    return failed(error instanceof AiProviderError ? error.code : "UNEXPECTED");
  }
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

// Runs the Bake-off and returns the folder the files went to.
export async function runBakeOff(options: BakeOffOptions): Promise<string> {
  const { args, env } = options;
  // Settings first: a missing setting writes nothing.
  const contenders = resolveContenders(args, env);
  const fixtures = await loadFixtures(options.fixturesDir ?? FIXTURES_DIR);
  const date = osloDay(options.now ?? new Date());
  const outDir =
    args.out ??
    (args.dry
      ? await mkdtemp(join(tmpdir(), "bake-off-"))
      : join(LIVE_OUT_ROOT, date));
  // A live run costs money and its results.md is scored by hand: never
  // overwrite one. A dry run only ever writes mock output.
  if (!args.dry && existsSync(join(outDir, "results.md"))) {
    throw new BakeOffUsageError(
      `${outDir} already has a results.md; use a new --out folder or move the old folder`,
    );
  }
  const adapterFor = options.adapterFor ?? defaultAdapterFor(args.dry);

  const records: RequestRecord[] = [];
  for (const fixture of fixtures) {
    // Contact details never go to a provider (FR-26).
    const cvText = stripContactDetails(fixture.cvText);
    for (const contender of contenders) {
      const folder = join(outDir, contender.folder);
      await mkdir(folder, { recursive: true });
      const base = {
        fixture: fixture.id,
        provider: contender.id,
        model: contender.model,
      };

      const letter = await request(
        adapterFor(contender, "letter"),
        letterPrompt({
          cvText,
          jobAd: fixture.jobAd,
          jobTitle: fixture.jobTitle,
          employer: fixture.employer,
          tone: "Formell",
        }),
        letterSchema,
      );
      if (letter.ok) {
        const file = `${contender.folder}/${fixture.id}.letter.txt`;
        await writeFile(join(outDir, file), `${letter.data.text}\n`, "utf8");
        records.push({
          ...base,
          task: "letter",
          status: "ok",
          file,
          words: wordCount(letter.data.text),
          inputTokens: letter.inputTokens,
          outputTokens: letter.outputTokens,
          durationMs: letter.durationMs,
        });
      } else {
        records.push({
          ...base,
          task: "letter",
          status: "failed",
          errorCode: letter.errorCode,
          inputTokens: null,
          outputTokens: null,
          durationMs: letter.durationMs,
        });
      }

      const gap = await request(
        adapterFor(contender, "gap"),
        gapPrompt({
          cvText,
          jobAd: fixture.jobAd,
          missingKeywords: fixture.missingKeywords,
        }),
        gapSchema,
      );
      if (gap.ok) {
        const file = `${contender.folder}/${fixture.id}.gap.json`;
        await writeFile(
          join(outDir, file),
          `${JSON.stringify(gap.data, null, 2)}\n`,
          "utf8",
        );
        records.push({
          ...base,
          task: "gap",
          status: "ok",
          file,
          inputTokens: gap.inputTokens,
          outputTokens: gap.outputTokens,
          durationMs: gap.durationMs,
        });
      } else {
        records.push({
          ...base,
          task: "gap",
          status: "failed",
          errorCode: gap.errorCode,
          inputTokens: null,
          outputTokens: null,
          durationMs: gap.durationMs,
        });
      }
    }
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "results.md"),
    renderResults(
      {
        date,
        dry: args.dry,
        contenders: contenders.map((c) => ({
          provider: c.id,
          model: c.model,
          price: c.price,
        })),
      },
      records,
    ),
    "utf8",
  );
  return outDir;
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
    const outDir = await runBakeOff({
      args: parseArgs(process.argv.slice(2)),
      env: process.env,
    });
    process.stdout.write(`Bake-off written to ${outDir}\n`);
  } catch (error) {
    // The message of a usage error names a setting, never a value. Anything
    // else is reported by its type only: a provider message could hold content.
    const reason =
      error instanceof BakeOffUsageError
        ? error.message
        : `Bake-off failed (${error instanceof Error ? error.name : "unknown error"})`;
    process.stderr.write(`${reason}\n`);
    process.exitCode = 1;
  }
}

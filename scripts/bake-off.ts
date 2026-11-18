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

const PROVIDERS = ["anthropic", "openai", "openrouter"] as const;
type Provider = (typeof PROVIDERS)[number];

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";
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

export type BakeOffArgs = {
  readonly dry: boolean;
  readonly out: string | undefined;
  readonly priceIn: Partial<Record<Provider, number>>;
  readonly priceOut: Partial<Record<Provider, number>>;
};

const isProvider = (value: string): value is Provider =>
  (PROVIDERS as readonly string[]).includes(value);

function parsePrice(
  flag: string,
  value: string | undefined,
  into: Partial<Record<Provider, number>>,
): void {
  const [name = "", amount = ""] = (value ?? "").split("=");
  const number = Number(amount);
  if (
    !isProvider(name) ||
    amount === "" ||
    !Number.isFinite(number) ||
    number < 0
  ) {
    throw new BakeOffUsageError(
      `${flag} takes <anthropic|openai|openrouter>=<USD per million tokens>`,
    );
  }
  into[name] = number;
}

export function parseArgs(argv: readonly string[]): BakeOffArgs {
  let dry = false;
  let out: string | undefined;
  const priceIn: Partial<Record<Provider, number>> = {};
  const priceOut: Partial<Record<Provider, number>> = {};
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

type Contender = {
  readonly provider: Provider;
  readonly model: string;
  readonly apiKey: string | undefined;
  readonly price: Price | undefined;
};

type Env = Readonly<Record<string, string | undefined>>;

// Everything the run needs, checked before anything is written.
export function resolveContenders(args: BakeOffArgs, env: Env): Contender[] {
  const read = (name: string) =>
    env[name] === undefined || env[name] === "" ? undefined : env[name];
  const anthropicModel =
    read("BAKE_OFF_ANTHROPIC_MODEL") ?? DEFAULT_ANTHROPIC_MODEL;
  const openaiModel = read("BAKE_OFF_OPENAI_MODEL");
  const openrouterKey = read("BAKE_OFF_OPENROUTER_KEY");
  const openrouterModel = read("BAKE_OFF_OPENROUTER_MODEL");
  // OpenRouter is optional: it joins when its key is set (or in a dry run).
  // With the key set, its model is required, as for OpenAI.
  const withOpenRouter = args.dry || openrouterKey !== undefined;
  // A model or a price without the key is a typo or a forgotten key, not a
  // choice: a paid run must not look like a three-way comparison and be two.
  const openrouterAsked =
    openrouterModel !== undefined ||
    args.priceIn.openrouter !== undefined ||
    args.priceOut.openrouter !== undefined;
  if (!args.dry) {
    const missing = [
      read("BAKE_OFF_ANTHROPIC_KEY") === undefined
        ? "BAKE_OFF_ANTHROPIC_KEY"
        : null,
      read("BAKE_OFF_OPENAI_KEY") === undefined ? "BAKE_OFF_OPENAI_KEY" : null,
      openrouterAsked && openrouterKey === undefined
        ? "BAKE_OFF_OPENROUTER_KEY"
        : null,
      openaiModel === undefined ? "BAKE_OFF_OPENAI_MODEL" : null,
      openrouterKey !== undefined && openrouterModel === undefined
        ? "BAKE_OFF_OPENROUTER_MODEL"
        : null,
    ].filter((name) => name !== null);
    if (missing.length > 0) {
      throw new BakeOffUsageError(`Missing setting: ${missing.join(", ")}`);
    }
  }
  const price = (provider: Provider): Price | undefined => {
    const inPerMillion = args.priceIn[provider];
    const outPerMillion = args.priceOut[provider];
    return inPerMillion === undefined || outPerMillion === undefined
      ? undefined
      : { inPerMillion, outPerMillion };
  };
  const contenders: Contender[] = [
    {
      provider: "anthropic",
      model: anthropicModel,
      apiKey: read("BAKE_OFF_ANTHROPIC_KEY"),
      price: price("anthropic"),
    },
    {
      provider: "openai",
      model: openaiModel ?? "mock-1",
      apiKey: read("BAKE_OFF_OPENAI_KEY"),
      price: price("openai"),
    },
  ];
  if (withOpenRouter) {
    contenders.push({
      provider: "openrouter",
      model: openrouterModel ?? "mock-1",
      apiKey: openrouterKey,
      price: price("openrouter"),
    });
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
      const folder = join(outDir, contender.provider);
      await mkdir(folder, { recursive: true });
      const base = {
        fixture: fixture.id,
        provider: contender.provider,
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
        const file = `${contender.provider}/${fixture.id}.letter.txt`;
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
        const file = `${contender.provider}/${fixture.id}.gap.json`;
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
          provider: c.provider,
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

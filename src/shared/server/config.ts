import "server-only";
import { z } from "zod";

// Flag defaults live here and nowhere else (AD-4). The environment only
// overrides them.
export const FEATURE_DEFAULTS = {
  accounts: false,
  // On since Story 4.6: the Gap analysis runs with every Application. Never on
  // Hosted, which has no AI (D23).
  gaps: true,
  // On since Story 5.4: each Rewordable gap carries a rewording suggestion
  // (FR-16), guarded by FR-17. Never on Hosted, which has no AI (D23).
  rewording: true,
  // On since Story 3.11 (FR-5b applies, decided 17 Nov): AI proposes the Keyword
  // list of a new Job ad. Never on Hosted, which has no AI (D23).
  keywordFallback: true,
} as const;

export type Features = Record<keyof typeof FEATURE_DEFAULTS, boolean>;

export type AiAdapter = "live" | "cached" | "mock";
export type DbKind = "postgres" | "pglite";

// What the AI notice tells the Student (FR-24). `version` changes whenever the
// provider, the retention period or the keyword fallback changes, so a stored
// consent for an older notice stops counting.
export type AiNotice = {
  readonly version: string;
  readonly providerName: string;
  readonly retentionDays: number | null;
};

export type Config = {
  readonly hosted: boolean;
  readonly testMode: boolean;
  readonly isTestRun: boolean;
  // The Hosted Access code (AD-12). Never sent to the client or logged.
  readonly accessCode: string | undefined;
  // The live settings are read as given; `RunMode` never carries them. In a
  // test run the key is withheld, so nothing there can reach a provider.
  readonly ai: {
    readonly adapter: AiAdapter;
    readonly provider: string | undefined;
    readonly model: string | undefined;
    readonly apiKey: string | undefined;
  };
  readonly db: { readonly kind: DbKind; readonly url: string };
  // The one key for personal fields (AD-11): base64 of 32 bytes. Never logged,
  // never sent to the client. Absent unless set; config never invents one.
  readonly encryptionKey: string | undefined;
  readonly features: Features;
  readonly aiNotice: AiNotice;
};

export const LOCAL_DATABASE_URL =
  "postgres://jobassistant:jobassistant@127.0.0.1:54320/jobassistant";

const ACCESS_CODE_MIN_LENGTH = 16;

export const DEFAULT_SECRETS_FILE = ".data/secrets.env";

// Base64 of exactly 32 bytes in canonical form: 43 characters, one `=`, and
// the unused low bits of the last character zero.
const ENCRYPTION_KEY_FORMAT = /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/;

const flag = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

const envSchema = z.object({
  APP_ENV: z.enum(["local", "hosted"]).default("local"),
  TEST_MODE: flag,
  AI_PROVIDER: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_RETENTION_DAYS: z
    .string()
    .regex(/^\d{1,4}$/)
    .transform(Number)
    .optional(),
  AI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  ACCESS_CODE: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  SECRETS_FILE: z.string().optional(),
  VERCEL: z.string().optional(),
  VITEST: z.string().optional(),
  E2E: z.string().optional(),
  FEATURE_ACCOUNTS: flag,
  FEATURE_GAPS: flag,
  FEATURE_REWORDING: flag,
  FEATURE_KEYWORD_FALLBACK: flag,
});

function dbKind(url: string): DbKind {
  if (url === "pglite://memory") return "pglite";
  if (/^postgres(ql)?:\/\//.test(url)) return "postgres";
  throw new Error(
    "Invalid configuration: DATABASE_URL must start with postgres://, postgresql:// or be pglite://memory",
  );
}

// Pure: reads only the object it is given. An empty string counts as unset.
export function parseConfig(env: Record<string, string | undefined>): Config {
  const present = Object.fromEntries(
    Object.entries(env).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`Invalid configuration: ${[...new Set(names)].join(", ")}`);
  }
  const e = parsed.data;

  const hosted = e.APP_ENV === "hosted";
  const isTestRun = e.VITEST !== undefined || e.E2E === "1";

  if (e.VERCEL === "1" && !hosted) {
    throw new Error("Invalid configuration: APP_ENV must be hosted on Vercel");
  }
  if (hosted) {
    if (
      e.ACCESS_CODE === undefined ||
      e.ACCESS_CODE.length < ACCESS_CODE_MIN_LENGTH
    ) {
      throw new Error(
        `Invalid configuration: ACCESS_CODE must be at least ${ACCESS_CODE_MIN_LENGTH} characters on Hosted`,
      );
    }
    if (e.DATABASE_URL === undefined) {
      throw new Error(
        "Invalid configuration: DATABASE_URL is required on Hosted",
      );
    }
    if (e.TEST_MODE === true) {
      throw new Error(
        "Invalid configuration: TEST_MODE cannot be true on Hosted",
      );
    }
    // Hosted is the frozen skeleton with no AI (D23). A half-set AI config
    // there is a mistake, so it fails at startup and names the setting, never
    // its value. A complete one (provider, key and model) is accepted here: it
    // is the deploy that keeps AI off Hosted (`vercel.json`, no `AI_*` in
    // Production), not this rule.
    if (e.AI_PROVIDER !== undefined && e.AI_API_KEY === undefined) {
      throw new Error(
        "Invalid configuration: AI_API_KEY is required when AI_PROVIDER is set on Hosted",
      );
    }
    if (e.AI_PROVIDER !== undefined && e.AI_MODEL === undefined) {
      throw new Error(
        "Invalid configuration: AI_MODEL is required when AI_PROVIDER is set on Hosted",
      );
    }
    if (e.AI_PROVIDER === undefined && e.AI_API_KEY !== undefined) {
      throw new Error(
        "Invalid configuration: AI_PROVIDER is required when AI_API_KEY is set on Hosted",
      );
    }
    if (e.AI_PROVIDER === undefined && e.AI_MODEL !== undefined) {
      throw new Error(
        "Invalid configuration: AI_PROVIDER is required when AI_MODEL is set on Hosted",
      );
    }
  }

  // The message names the setting and never the value.
  if (
    e.ENCRYPTION_KEY !== undefined &&
    !ENCRYPTION_KEY_FORMAT.test(e.ENCRYPTION_KEY)
  ) {
    throw new Error(
      "Invalid configuration: ENCRYPTION_KEY must be 32 bytes, base64",
    );
  }
  const accounts = e.FEATURE_ACCOUNTS ?? FEATURE_DEFAULTS.accounts;

  const url = e.DATABASE_URL ?? LOCAL_DATABASE_URL;
  const kind = dbKind(url);
  if (isTestRun && kind === "postgres") {
    throw new Error(
      "Invalid configuration: DATABASE_URL must be pglite://memory in a test run",
    );
  }

  // A test run never sees an AI key, so it can never resolve to `live` (AD-3).
  // Live needs the provider, the model and the key; with any missing the app
  // stays in Test mode.
  const hasKey =
    !isTestRun &&
    e.AI_API_KEY !== undefined &&
    e.AI_PROVIDER !== undefined &&
    e.AI_MODEL !== undefined;
  const testMode = e.TEST_MODE === true || !hasKey;

  const features: Features = {
    accounts,
    // Hosted has no AI (D23), so the Gap analysis is off there whatever the
    // environment says, as the Keyword fallback is.
    gaps: hosted ? false : (e.FEATURE_GAPS ?? FEATURE_DEFAULTS.gaps),
    // Hosted has no AI (D23), so there is nothing to reword there whatever the
    // environment says, as with the Gap analysis it rides on.
    rewording: hosted
      ? false
      : (e.FEATURE_REWORDING ?? FEATURE_DEFAULTS.rewording),
    // Hosted is the frozen skeleton with no AI and no Student data (D23), so
    // the Keyword fallback is off there whatever the environment says.
    keywordFallback: hosted
      ? false
      : (e.FEATURE_KEYWORD_FALLBACK ?? FEATURE_DEFAULTS.keywordFallback),
  };
  const providerName = e.AI_PROVIDER ?? "none";
  const retentionDays = e.AI_RETENTION_DAYS ?? null;

  return {
    hosted,
    testMode,
    isTestRun,
    accessCode: e.ACCESS_CODE,
    ai: {
      adapter: testMode ? "cached" : "live",
      provider: e.AI_PROVIDER,
      model: e.AI_MODEL,
      apiKey: isTestRun ? undefined : e.AI_API_KEY,
    },
    db: { kind, url },
    encryptionKey: e.ENCRYPTION_KEY,
    features,
    aiNotice: {
      version: [
        // Bump this prefix whenever the notice text in messages.nb.ts changes
        // (Story 3.6 wrote the first text; Story 3.11 added the sentence that
        // the Job ad, never the CV, is sent for Keywords), so earlier consents
        // stop counting.
        "notice-3",
        encodeURIComponent(providerName),
        retentionDays === null ? "unknown" : String(retentionDays),
        features.keywordFallback ? "fallback" : "no-fallback",
      ].join(":"),
      providerName,
      retentionDays,
    },
  };
}

type Env = Record<string, string | undefined>;

const isSet = (value: string | undefined): value is string =>
  value !== undefined && value !== "";

// A test run: VITEST set (empty counts as unset) or E2E=1, as `parseConfig`
// reads it.
export function isTestRunEnv(env: Env = process.env): boolean {
  return isSet(env.VITEST) || env.E2E === "1";
}

// The file with the local secrets (AD-17). Only config reads it; setup asks
// here for the path it may write.
export function secretsFilePath(env: Env = process.env): string {
  return isSet(env.SECRETS_FILE) ? env.SECRETS_FILE : DEFAULT_SECRETS_FILE;
}

// The environment as the app sees it. On a local run outside tests the secrets
// file is merged under `env`, which wins; Hosted and test runs never read it.
// A missing file is fine; an unreadable one fails naming the setting.
export function readEnv(env: Env = process.env): Env {
  const local = !isSet(env.APP_ENV) || env.APP_ENV === "local";
  if (!local || isTestRunEnv(env)) return env;
  // Through the process so the Edge-runtime analysis of this module stays
  // quiet; this branch only runs on Node.
  const node = globalThis.process;
  if (typeof node?.getBuiltinModule !== "function") return env;
  let text: string;
  try {
    text = node
      .getBuiltinModule("node:fs")
      .readFileSync(secretsFilePath(env), "utf8");
  } catch (error) {
    if ((error as { code?: unknown }).code === "ENOENT") return env;
    throw new Error("Invalid configuration: SECRETS_FILE could not be read");
  }
  const fromFile = node.getBuiltinModule("node:util").parseEnv(text);
  const present = Object.fromEntries(
    Object.entries(env).filter(([, value]) => isSet(value)),
  );
  return { ...fromFile, ...present };
}

let memo: Config | undefined;

// Lazy and memoised. Call it only inside handlers and startup hooks, never at
// module top level, so `next build` never reads run-time settings.
export function getConfig(): Config {
  memo ??= parseConfig(readEnv());
  return memo;
}

// Startup check, called from instrumentation on the Node runtime only. A failed
// instrumentation hook leaves `next start` serving 500s, so the process ends.
// The message names the setting and never its value.
// With accounts on, the key must exist at start (AD-3): Hosted fails, and a
// local run stops and says to run setup. Kept out of `parseConfig` so that
// reading a config stays possible before setup has written the key. Names the
// setting, never a value.
export function assertEncryptionKey(
  config: Pick<Config, "hosted" | "encryptionKey" | "features">,
): void {
  if (!config.features.accounts || config.encryptionKey !== undefined) return;
  throw new Error(
    config.hosted
      ? "Invalid configuration: ENCRYPTION_KEY is required on Hosted when FEATURE_ACCOUNTS is on"
      : "Invalid configuration: ENCRYPTION_KEY is missing: run setup (npm run dev, or docker compose up)",
  );
}

export function assertStartupConfig(env?: Env): void {
  if ((env ?? process.env).NEXT_RUNTIME !== "nodejs") return;
  try {
    assertEncryptionKey(parseConfig(env ?? readEnv()));
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Invalid configuration";
    // Through globalThis so the Edge-runtime analysis of this module stays
    // quiet; this branch only runs on Node.
    const node = globalThis.process;
    node.stderr.write(`${reason}\n`);
    node.exit(1);
  }
}

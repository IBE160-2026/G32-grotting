import "server-only";
import { z } from "zod";

// Flag defaults live here and nowhere else (AD-4). The environment only
// overrides them.
export const FEATURE_DEFAULTS = {
  accounts: false,
  gaps: false,
  rewording: false,
  keywordFallback: false,
} as const;

export type Features = Record<keyof typeof FEATURE_DEFAULTS, boolean>;

export type AiAdapter = "live" | "cached" | "mock";
export type DbKind = "postgres" | "pglite";

export type Config = {
  readonly hosted: boolean;
  readonly testMode: boolean;
  readonly isTestRun: boolean;
  readonly ai: { readonly adapter: AiAdapter };
  readonly db: { readonly kind: DbKind; readonly url: string };
  readonly features: Features;
};

export const LOCAL_DATABASE_URL =
  "postgres://jobassistant:jobassistant@127.0.0.1:54320/jobassistant";

const ACCESS_CODE_MIN_LENGTH = 16;

const flag = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

const envSchema = z.object({
  APP_ENV: z.enum(["local", "hosted"]).default("local"),
  TEST_MODE: flag,
  AI_PROVIDER: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  ACCESS_CODE: z.string().optional(),
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
  }

  const url = e.DATABASE_URL ?? LOCAL_DATABASE_URL;
  const kind = dbKind(url);
  if (isTestRun && kind === "postgres") {
    throw new Error(
      "Invalid configuration: DATABASE_URL must be pglite://memory in a test run",
    );
  }

  // A test run never sees an AI key, so it can never resolve to `live` (AD-3).
  const hasKey =
    !isTestRun && e.AI_API_KEY !== undefined && e.AI_PROVIDER !== undefined;
  const testMode = e.TEST_MODE === true || !hasKey;

  return {
    hosted,
    testMode,
    isTestRun,
    ai: { adapter: testMode ? "cached" : "live" },
    db: { kind, url },
    features: {
      accounts: e.FEATURE_ACCOUNTS ?? FEATURE_DEFAULTS.accounts,
      gaps: e.FEATURE_GAPS ?? FEATURE_DEFAULTS.gaps,
      rewording: e.FEATURE_REWORDING ?? FEATURE_DEFAULTS.rewording,
      keywordFallback:
        e.FEATURE_KEYWORD_FALLBACK ?? FEATURE_DEFAULTS.keywordFallback,
    },
  };
}

let memo: Config | undefined;

// Lazy and memoised. Call it only inside handlers and startup hooks, never at
// module top level, so `next build` never reads run-time settings.
export function getConfig(): Config {
  memo ??= parseConfig(process.env);
  return memo;
}

// Startup check, called from instrumentation on the Node runtime only. A failed
// instrumentation hook leaves `next start` serving 500s, so the process ends.
// The message names the setting and never its value.
export function assertStartupConfig(
  env: Record<string, string | undefined> = process.env,
): void {
  if (env.NEXT_RUNTIME !== "nodejs") return;
  try {
    parseConfig(env);
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

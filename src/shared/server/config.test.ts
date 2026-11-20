import { describe, expect, it, vi } from "vitest";
import {
  assertStartupConfig,
  FEATURE_DEFAULTS,
  getConfig,
  LOCAL_DATABASE_URL,
  parseConfig,
} from "./config";

const ACCESS_CODE = "a-long-random-code-1234";
const hostedEnv = {
  APP_ENV: "hosted",
  ACCESS_CODE,
  DATABASE_URL: "postgresql://user:pw@db.example.com:5432/postgres",
};

describe("FR-27 mode detection", () => {
  it("runs local without a key in Test mode on cached answers", () => {
    const config = parseConfig({});
    expect(config.testMode).toBe(true);
    expect(config.ai.adapter).toBe("cached");
    expect(config.hosted).toBe(false);
    expect(config.features).toEqual({
      accounts: false,
      gaps: false,
      rewording: false,
      keywordFallback: true,
    });
  });

  it("goes live when a key and a provider are set outside a test run", () => {
    const config = parseConfig({
      AI_API_KEY: "k",
      AI_PROVIDER: "p",
      AI_MODEL: "m",
    });
    expect(config.testMode).toBe(false);
    expect(config.ai).toEqual({
      adapter: "live",
      provider: "p",
      model: "m",
      apiKey: "k",
    });
  });

  it("stays in Test mode when the provider, the model or the key is missing", () => {
    const all = { AI_API_KEY: "k", AI_PROVIDER: "p", AI_MODEL: "m" };
    for (const missing of Object.keys(all)) {
      const env = { ...all, [missing]: "" };
      const config = parseConfig(env);
      expect(config.testMode).toBe(true);
      expect(config.ai.adapter).toBe("cached");
    }
  });

  it("does not let AI_MODEL change the notice version", () => {
    const base = { AI_API_KEY: "k", AI_PROVIDER: "p", AI_RETENTION_DAYS: "30" };
    expect(parseConfig({ ...base, AI_MODEL: "a" }).aiNotice.version).toBe(
      parseConfig({ ...base, AI_MODEL: "b" }).aiNotice.version,
    );
  });

  it("treats the AI key as absent in a test run", () => {
    for (const run of [{ VITEST: "true" }, { E2E: "1" }]) {
      const config = parseConfig({
        ...run,
        AI_API_KEY: "k",
        AI_PROVIDER: "p",
        AI_MODEL: "m",
        DATABASE_URL: "pglite://memory",
      });
      expect(config.isTestRun).toBe(true);
      expect(config.testMode).toBe(true);
      expect(config.ai.adapter).toBe("cached");
      expect(config.ai.apiKey).toBeUndefined();
    }
  });

  it("refuses a postgres DATABASE_URL in a test run", () => {
    expect(() =>
      parseConfig({ VITEST: "true", DATABASE_URL: "postgres://u:p@h:5432/d" }),
    ).toThrow(/DATABASE_URL/);
    expect(() => parseConfig({ E2E: "1" })).toThrow(/DATABASE_URL/);
  });

  it("forces Test mode with TEST_MODE=true whatever the key", () => {
    const config = parseConfig({
      TEST_MODE: "true",
      AI_API_KEY: "k",
      AI_PROVIDER: "p",
    });
    expect(config.testMode).toBe(true);
    expect(config.ai.adapter).toBe("cached");
  });

  it("counts empty strings as unset", () => {
    const config = parseConfig({
      APP_ENV: "",
      TEST_MODE: "",
      AI_API_KEY: "",
      AI_PROVIDER: "",
      DATABASE_URL: "",
      FEATURE_GAPS: "",
    });
    expect(config.hosted).toBe(false);
    expect(config.testMode).toBe(true);
    expect(config.db.url).toBe(LOCAL_DATABASE_URL);
    expect(config.features.gaps).toBe(FEATURE_DEFAULTS.gaps);
  });

  it("lets FEATURE_* override the defaults", () => {
    const config = parseConfig({
      FEATURE_ACCOUNTS: "true",
      FEATURE_KEYWORD_FALLBACK: "false",
      FEATURE_GAPS: "true",
    });
    expect(config.features).toEqual({
      accounts: true,
      gaps: true,
      rewording: false,
      keywordFallback: false,
    });
    expect(() => parseConfig({ FEATURE_GAPS: "yes" })).toThrow(/FEATURE_GAPS/);
  });

  it("FR-5b switches the Keyword fallback on by default (Story 3.11)", () => {
    expect(FEATURE_DEFAULTS.keywordFallback).toBe(true);
    expect(parseConfig({}).features.keywordFallback).toBe(true);
    expect(
      parseConfig({ FEATURE_KEYWORD_FALLBACK: "false" }).features
        .keywordFallback,
    ).toBe(false);
  });

  it("keeps the Keyword fallback off on Hosted, which has no AI (D23)", () => {
    expect(parseConfig(hostedEnv).features.keywordFallback).toBe(false);
    expect(
      parseConfig({ ...hostedEnv, FEATURE_KEYWORD_FALLBACK: "true" }).features
        .keywordFallback,
    ).toBe(false);
  });

  it("FR-24 starts the notice version with notice-3, which the keyword sentence needs", () => {
    expect(parseConfig({}).aiNotice.version).toMatch(
      /^notice-3:none:unknown:fallback$/,
    );
  });

  it("reports hosted on a complete Hosted config", () => {
    const config = parseConfig(hostedEnv);
    expect(config.hosted).toBe(true);
    expect(config.db.kind).toBe("postgres");
  });
});

describe("FR-24 AI notice config (AD-4)", () => {
  it("names no provider and no retention when nothing is set", () => {
    expect(parseConfig({}).aiNotice).toMatchObject({
      providerName: "none",
      retentionDays: null,
    });
  });

  it("reads the provider and the retention period", () => {
    expect(
      parseConfig({ AI_PROVIDER: "acme", AI_RETENTION_DAYS: "30" }).aiNotice,
    ).toMatchObject({ providerName: "acme", retentionDays: 30 });
  });

  it("fails on a retention period that is not a whole number", () => {
    expect(() => parseConfig({ AI_RETENTION_DAYS: "soon" })).toThrow(
      /AI_RETENTION_DAYS/,
    );
    expect(() => parseConfig({ AI_RETENTION_DAYS: "-1" })).toThrow(
      /AI_RETENTION_DAYS/,
    );
  });

  it("changes the version when the provider, the retention or the keyword fallback changes", () => {
    const base = { AI_PROVIDER: "acme", AI_RETENTION_DAYS: "30" };
    const version = (env: Record<string, string>) =>
      parseConfig(env).aiNotice.version;
    const versions = [
      version(base),
      version({ ...base, AI_PROVIDER: "other" }),
      version({ ...base, AI_RETENTION_DAYS: "7" }),
      version({ ...base, FEATURE_KEYWORD_FALLBACK: "false" }),
      version({ AI_PROVIDER: "acme" }),
    ];
    expect(new Set(versions).size).toBe(versions.length);
    expect(version(base)).toBe(version({ ...base }));
  });
});

describe("NFR-7 startup fails on bad Hosted config (AD-3)", () => {
  it("fails on Vercel when APP_ENV is not hosted", () => {
    expect(() => parseConfig({ VERCEL: "1" })).toThrow(/APP_ENV/);
    expect(() => parseConfig({ VERCEL: "1", APP_ENV: "local" })).toThrow(
      /APP_ENV/,
    );
  });

  it("fails when ACCESS_CODE is missing or shorter than 16 characters", () => {
    const { ACCESS_CODE: _removed, ...withoutCode } = hostedEnv;
    expect(() => parseConfig(withoutCode)).toThrow(/ACCESS_CODE/);
    expect(() => parseConfig({ ...hostedEnv, ACCESS_CODE: "short" })).toThrow(
      /ACCESS_CODE/,
    );
    expect(() =>
      parseConfig({ ...hostedEnv, ACCESS_CODE: "x".repeat(15) }),
    ).toThrow(/ACCESS_CODE/);
    expect(() =>
      parseConfig({ ...hostedEnv, ACCESS_CODE: "x".repeat(16) }),
    ).not.toThrow();
  });

  it("FR-31 exposes the Access code on Hosted and leaves it unset locally", () => {
    expect(parseConfig(hostedEnv).accessCode).toBe(ACCESS_CODE);
    expect(parseConfig({}).accessCode).toBeUndefined();
  });

  it("fails when DATABASE_URL is missing on Hosted", () => {
    const { DATABASE_URL: _removed, ...withoutUrl } = hostedEnv;
    expect(() => parseConfig(withoutUrl)).toThrow(/DATABASE_URL/);
  });

  it("fails when TEST_MODE=true on Hosted", () => {
    expect(() => parseConfig({ ...hostedEnv, TEST_MODE: "true" })).toThrow(
      /TEST_MODE/,
    );
  });

  it("fails on Hosted when AI_PROVIDER is set without AI_API_KEY", () => {
    expect(() =>
      parseConfig({ ...hostedEnv, AI_PROVIDER: "openrouter" }),
    ).toThrow(/AI_API_KEY/);
    expect(() =>
      parseConfig({
        ...hostedEnv,
        AI_PROVIDER: "openrouter",
        AI_MODEL: "m",
      }),
    ).toThrow(/AI_API_KEY/);
  });

  it("fails on Hosted when AI_API_KEY is set without AI_PROVIDER", () => {
    expect(() => parseConfig({ ...hostedEnv, AI_API_KEY: "k" })).toThrow(
      /AI_PROVIDER/,
    );
  });

  it("fails on Hosted when AI_MODEL is set without AI_PROVIDER", () => {
    expect(() => parseConfig({ ...hostedEnv, AI_MODEL: "m" })).toThrow(
      /AI_PROVIDER/,
    );
  });

  it("never prints an AI value in the Hosted AI errors", () => {
    expect(() =>
      parseConfig({ ...hostedEnv, AI_API_KEY: "secret-key-value" }),
    ).toThrow(/^(?!.*secret-key-value)/);
  });

  it("keeps the local AI settings working outside Hosted", () => {
    expect(() => parseConfig({ AI_PROVIDER: "openrouter" })).not.toThrow();
    expect(() => parseConfig({ AI_API_KEY: "k" })).not.toThrow();
  });

  it("fails on an unknown APP_ENV or DATABASE_URL scheme", () => {
    expect(() => parseConfig({ APP_ENV: "staging" })).toThrow(/APP_ENV/);
    expect(() => parseConfig({ DATABASE_URL: "mysql://h/d" })).toThrow(
      /DATABASE_URL/,
    );
  });
});

describe("NFR-9 runnability without setup", () => {
  it("defaults to the local Postgres container", () => {
    const config = parseConfig({});
    expect(config.db).toEqual({ kind: "postgres", url: LOCAL_DATABASE_URL });
  });

  it("reads the database kind from the URL scheme", () => {
    expect(parseConfig({ DATABASE_URL: "postgres://h/d" }).db.kind).toBe(
      "postgres",
    );
    expect(parseConfig({ DATABASE_URL: "postgresql://h/d" }).db.kind).toBe(
      "postgres",
    );
    expect(
      parseConfig({ E2E: "1", DATABASE_URL: "pglite://memory" }).db.kind,
    ).toBe("pglite");
  });

  it("memoises getConfig from the fixed test environment", () => {
    const config = getConfig();
    expect(getConfig()).toBe(config);
    expect(config.isTestRun).toBe(true);
    expect(config.db.kind).toBe("pglite");
  });
});

describe("NFR-7 Hosted start stops on bad config (AD-3)", () => {
  const spies = () => {
    const exit = vi
      .spyOn(globalThis.process, "exit")
      .mockImplementation((() => undefined) as never);
    const write = vi
      .spyOn(globalThis.process.stderr, "write")
      .mockImplementation(() => true);
    return { exit, write };
  };

  it("writes the setting name to stderr and exits 1", () => {
    const { exit, write } = spies();
    assertStartupConfig({
      NEXT_RUNTIME: "nodejs",
      APP_ENV: "hosted",
      DATABASE_URL: hostedEnv.DATABASE_URL,
    });
    expect(exit).toHaveBeenCalledWith(1);
    expect(String(write.mock.calls[0]?.[0])).toContain("ACCESS_CODE");
    vi.restoreAllMocks();
  });

  it("does nothing on a good config or off the Node runtime", () => {
    const { exit } = spies();
    assertStartupConfig({ NEXT_RUNTIME: "nodejs", ...hostedEnv });
    assertStartupConfig({ NEXT_RUNTIME: "edge", APP_ENV: "hosted" });
    expect(exit).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

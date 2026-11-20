import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { getConfig } from "@/shared/server/config";
import { contentHash } from "@/shared/server/content-hash";
import { closeDb, getDb } from "@/shared/server/db";
import { log } from "@/shared/server/log";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));
// Real behaviour by default; a test overrides one call to reach the production
// defaults (`getConfig().testMode`) or a database failure.
vi.mock("@/shared/server/config", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/shared/server/config")>();
  return { ...actual, getConfig: vi.fn(actual.getConfig) };
});
vi.mock("@/shared/server/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/server/db")>();
  return { ...actual, getDb: vi.fn(actual.getDb) };
});

// Wrapped, so a test can see what `runAi` hands the factory.
vi.mock("./adapters/factory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./adapters/factory")>();
  return { ...actual, createAdapter: vi.fn(actual.createAdapter) };
});

import { CachedMissError } from "./adapters/cached";
import { createAdapter } from "./adapters/factory";
import { AiProviderError } from "./adapters/live";
import { createMockAdapter } from "./adapters/mock";
import { DAILY_CAP } from "./daily-cap";
import { type AiRequest, runAi } from "./run-ai";

const schema = z.object({ text: z.string() });
const CTX = { studentId: null, consent: null };
const fixedNow = () => new Date("2026-11-18T10:00:00.000Z");

const CV_SENTINEL = "SENTINEL-CV-hemmelig-erfaring";
const AD_SENTINEL = "SENTINEL-AD-stillingstekst";
const ERROR_SENTINEL = "SENTINEL-ERR-melding";
const PROMPT_SENTINEL = "SENTINEL-PROMPT-instruks";
const RESPONSE_SENTINEL = "SENTINEL-RESPONSE-svar";

const cvText = `${CV_SENTINEL}\nola@example.no\n+47 22 33 44 55\nErfaring 2019–2022`;

function request(overrides: Partial<AiRequest<{ text: string }>> = {}) {
  return {
    task: "letter",
    cvText,
    jobAd: AD_SENTINEL,
    jobTitle: "Utvikler",
    employer: "Firma AS",
    tone: "formell",
    promptVersion: "v1",
    buildPrompt: (sent: string) =>
      `${PROMPT_SENTINEL}\n${sent}\n${AD_SENTINEL}`,
    schema,
    ...overrides,
  } satisfies AiRequest<{ text: string }>;
}

// Test mode on: the notice and the cap do not run (the 3.1 behaviour).
const options = (adapter: ReturnType<typeof createMockAdapter>) => ({
  adapter,
  now: fixedNow,
  testMode: true,
});

function loggedEvents() {
  return vi.mocked(log).mock.calls.map(([event]) => event);
}

beforeEach(() => {
  vi.mocked(log).mockClear();
});

afterAll(closeDb);

describe("AD-13 runAi success", () => {
  it("returns data, meta and the sent CV text, and logs one event with counts", async () => {
    const adapter = createMockAdapter({
      respond: () => ({ text: RESPONSE_SENTINEL }),
      usage: { inputTokens: 120, outputTokens: 45 },
    });
    const result = await runAi(request(), CTX, options(adapter));
    expect(result).toEqual({
      ok: true,
      value: {
        data: { text: RESPONSE_SENTINEL },
        meta: {
          source: "mock",
          provider: "mock",
          model: "mock-1",
          promptVersion: "v1",
          createdAt: "2026-11-18T10:00:00.000Z",
        },
        sentCvText: expect.any(String),
      },
    });
    expect(loggedEvents()).toEqual([
      {
        kind: "ai",
        task: "letter",
        provider: "mock",
        model: "mock-1",
        inputTokens: 120,
        outputTokens: 45,
        durationMs: 0,
        errorCode: null,
      },
    ]);
  });

  it("passes the key, one signal and no retries to the adapter", async () => {
    let seen: { lookupKey: string; maxRetries: number; signal: AbortSignal } =
      undefined as never;
    const adapter = createMockAdapter({
      respond: (args) => {
        seen = args;
        return { text: "x" };
      },
    });
    await runAi(request(), CTX, options(adapter));
    expect(seen.lookupKey).toMatch(/^[0-9a-f]{64}$/);
    expect(seen.maxRetries).toBe(0);
    expect(seen.signal.aborted).toBe(false);
  });

  it("FR-5b tells the adapter the task, and keys a Keyword request by the ad alone", async () => {
    const seen: { task?: string; lookupKey: string }[] = [];
    const adapter = createMockAdapter({
      respond: (args) => {
        seen.push(args);
        return { text: "x" };
      },
    });
    await runAi(request(), CTX, options(adapter));
    await runAi(
      request({ task: "keywords", cvText: undefined }),
      CTX,
      options(adapter),
    );
    expect(seen.map(({ task }) => task)).toEqual(["letter", "keywords"]);
    expect(seen[1]?.lookupKey).toBe(contentHash(AD_SENTINEL));
  });

  it("makes the key from the unstripped inputs", async () => {
    const keys: string[] = [];
    const adapter = createMockAdapter({
      respond: (args) => {
        keys.push(args.lookupKey);
        return { text: "x" };
      },
    });
    await runAi(request(), CTX, options(adapter));
    await runAi(request({ cvText: "ola@example.no" }), CTX, options(adapter));
    await runAi(request({ cvText: "" }), CTX, options(adapter));
    expect(new Set(keys).size).toBe(3);
  });
});

describe("AD-13 runAi result and clock", () => {
  it("returns the schema-parsed value as data", async () => {
    const adapter = createMockAdapter({
      respond: () => ({ text: "x", extra: "y" }),
    });
    const result = await runAi(request(), CTX, options(adapter));
    expect(result.ok && result.value.data).toEqual({ text: "x" });
  });

  it("logs the elapsed time from the injected clock", async () => {
    let calls = 0;
    const now = () =>
      new Date(Date.UTC(2026, 10, 18) + (calls++ === 0 ? 0 : 250));
    const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
    await runAi(request(), CTX, { adapter, now, testMode: true });
    expect(loggedEvents()[0]).toMatchObject({ kind: "ai", durationMs: 250 });
  });

  it("logs UNEXPECTED once and rethrows when the default adapter is unavailable", async () => {
    vi.mocked(createAdapter).mockImplementationOnce(() => {
      throw new Error("adapter unavailable");
    });
    await expect(
      runAi(request(), CTX, { now: fixedNow, testMode: true }),
    ).rejects.toThrow(/adapter unavailable/);
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      kind: "ai",
      errorCode: "UNEXPECTED",
    });
  });

  it("answers an input that is no Fixture with TEST_MODE_UNAVAILABLE on the default cached adapter", async () => {
    const result = await runAi(request(), CTX, {
      now: fixedNow,
      testMode: true,
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "TEST_MODE_UNAVAILABLE", retryable: false },
    });
    expect(createAdapter).toHaveBeenLastCalledWith(
      "cached",
      expect.objectContaining({ isTestRun: true }),
    );
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      provider: "cached",
      errorCode: "TEST_MODE_UNAVAILABLE",
    });
  });
});

describe("FR-26 strip", () => {
  it("builds the prompt and sentCvText from the stripped CV", async () => {
    const prompts: string[] = [];
    const adapter = createMockAdapter({
      respond: (args) => {
        prompts.push(args.prompt);
        return { text: "x" };
      },
    });
    const result = await runAi(request(), CTX, options(adapter));
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.sentCvText).toBe(
      `${CV_SENTINEL}\n\n\nErfaring 2019–2022`,
    );
    expect(prompts[0]).toContain(result.value.sentCvText);
    expect(prompts[0]).not.toMatch(/ola@example|22 33 44 55/);
  });

  it("skips the strip and sends an empty string without a CV", async () => {
    const seen: string[] = [];
    const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
    const result = await runAi(
      request({
        cvText: undefined,
        buildPrompt: (sent) => {
          seen.push(sent);
          return "p";
        },
      }),
      CTX,
      options(adapter),
    );
    expect(seen).toEqual([""]);
    expect(result.ok && result.value.sentCvText).toBe("");
  });
});

describe("NFR-4 failures", () => {
  it("times out at the limit when the adapter ignores the signal", async () => {
    const adapter = createMockAdapter();
    adapter.generate = () => new Promise(() => undefined);
    const started = Date.now();
    const result = await runAi(request(), CTX, {
      adapter,
      now: fixedNow,
      testMode: true,
      timeoutMs: 30,
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_TIMEOUT", retryable: true },
    });
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      kind: "ai",
      errorCode: "AI_TIMEOUT",
      inputTokens: null,
      outputTokens: null,
    });
  });

  it("times out when the adapter honours the signal", async () => {
    const adapter = createMockAdapter({ delayMs: 5000 });
    const result = await runAi(request(), CTX, {
      adapter,
      now: fixedNow,
      testMode: true,
      timeoutMs: 30,
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_TIMEOUT", retryable: true },
    });
    expect(loggedEvents()).toHaveLength(1);
  });

  it("does not leak an adapter failure that comes after the limit", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const adapter = createMockAdapter();
    adapter.generate = () =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("late")), 60),
      );
    await runAi(request(), CTX, {
      adapter,
      now: fixedNow,
      timeoutMs: 20,
      testMode: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("maps a provider failure to AI_PROVIDER_ERROR without CV text in the log", async () => {
    const adapter = createMockAdapter({
      error: new Error(`${ERROR_SENTINEL} ${CV_SENTINEL}`),
    });
    const result = await runAi(request(), CTX, options(adapter));
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_PROVIDER_ERROR", retryable: true },
    });
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      errorCode: "AI_PROVIDER_ERROR",
    });
  });

  it("maps a Cached miss to TEST_MODE_UNAVAILABLE, not retryable, and logs once", async () => {
    const adapter = createMockAdapter({ error: new CachedMissError() });
    const result = await runAi(request(), CTX, options(adapter));
    expect(result).toEqual({
      ok: false,
      error: { code: "TEST_MODE_UNAVAILABLE", retryable: false },
    });
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      errorCode: "TEST_MODE_UNAVAILABLE",
      inputTokens: null,
      outputTokens: null,
    });
    expect(JSON.stringify(loggedEvents())).not.toContain(CV_SENTINEL);
  });

  it("maps a bad shape to AI_PROVIDER_ERROR and logs once", async () => {
    const adapter = createMockAdapter({
      respond: () => ({ text: 42, extra: RESPONSE_SENTINEL }),
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    const result = await runAi(request(), CTX, options(adapter));
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_PROVIDER_ERROR", retryable: true },
    });
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      errorCode: "AI_PROVIDER_ERROR",
      inputTokens: 10,
      outputTokens: 5,
    });
  });

  it("logs UNEXPECTED once and rethrows when buildPrompt throws", async () => {
    const adapter = createMockAdapter();
    await expect(
      runAi(
        request({
          buildPrompt: () => {
            throw new Error(ERROR_SENTINEL);
          },
        }),
        CTX,
        options(adapter),
      ),
    ).rejects.toThrow(ERROR_SENTINEL);
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      kind: "ai",
      errorCode: "UNEXPECTED",
    });
  });
});

describe("NFR-8 the log holds no content", () => {
  const sentinels = [
    CV_SENTINEL,
    AD_SENTINEL,
    ERROR_SENTINEL,
    PROMPT_SENTINEL,
    RESPONSE_SENTINEL,
    "ola@example.no",
  ];

  it.each([
    [
      "success",
      createMockAdapter({ respond: () => ({ text: RESPONSE_SENTINEL }) }),
    ],
    [
      "provider failure",
      createMockAdapter({
        error: new Error(`${ERROR_SENTINEL} ${CV_SENTINEL}`),
      }),
    ],
    ["bad shape", createMockAdapter({ respond: () => RESPONSE_SENTINEL })],
  ])(
    "holds exactly one AI event and no sentinel on %s",
    async (_name, adapter) => {
      await runAi(request(), CTX, options(adapter));
      const events = loggedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ kind: "ai" });
      const written = JSON.stringify(events);
      for (const sentinel of sentinels) {
        expect(written).not.toContain(sentinel);
      }
    },
  );
});

// Test mode off: the mock adapter runs behind the notice and the cap, on PGlite.
const noticeVersion = () => getConfig().aiNotice.version;
const liveOptions = (
  adapter: ReturnType<typeof createMockAdapter>,
  now: () => Date = fixedNow,
) => ({ adapter, now, testMode: false });
const accepted = (studentId: string | null = null) => ({
  studentId,
  consent: { noticeVersion: noticeVersion() },
});

async function usage() {
  const db = await getDb();
  const result = await db.execute(
    sql`select scope, day::text as day, count from ai_usage order by scope, day`,
  );
  const rows = Array.isArray(result)
    ? result
    : (result as { rows: unknown[] }).rows;
  return rows as { scope: string; day: string; count: number }[];
}

async function clearUsage() {
  await (await getDb()).execute(sql`delete from ai_usage`);
}

describe("FR-24 notice on the server", () => {
  beforeEach(clearUsage);

  it.each([
    ["missing", { studentId: null, consent: null }],
    ["stale", { studentId: null, consent: { noticeVersion: "older-notice" } }],
  ])(
    "refuses a %s consent before the adapter and the database",
    async (_name, ctx) => {
      const respond = vi.fn(() => ({ text: "x" }));
      const adapter = createMockAdapter({ respond });
      const result = await runAi(request(), ctx, liveOptions(adapter));
      expect(result).toEqual({
        ok: false,
        error: { code: "AI_NOTICE_REQUIRED", retryable: false },
      });
      expect(respond).not.toHaveBeenCalled();
      expect(await usage()).toEqual([]);
      expect(loggedEvents()).toEqual([
        {
          kind: "ai",
          task: "letter",
          provider: "unknown",
          model: "unknown",
          inputTokens: null,
          outputTokens: null,
          durationMs: 0,
          errorCode: "AI_NOTICE_REQUIRED",
        },
      ]);
    },
  );

  it("lets a matching version through and counts it", async () => {
    const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
    const result = await runAi(request(), accepted(), liveOptions(adapter));
    expect(result.ok).toBe(true);
    expect(await usage()).toEqual([
      { scope: "installation", day: "2026-11-18", count: 1 },
    ]);
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({ errorCode: null });
  });
});

describe("FR-25 Daily cap on the server", () => {
  beforeEach(clearUsage);

  it("stops request 31 with no adapter call and one log event", async () => {
    const respond = vi.fn(() => ({ text: "x" }));
    const adapter = createMockAdapter({ respond });
    for (let i = 0; i < DAILY_CAP; i++) {
      const result = await runAi(request(), accepted(), liveOptions(adapter));
      expect(result.ok).toBe(true);
    }
    vi.mocked(log).mockClear();
    respond.mockClear();
    const result = await runAi(request(), accepted(), liveOptions(adapter));
    expect(result).toEqual({
      ok: false,
      error: { code: "DAILY_CAP_REACHED", retryable: false },
    });
    expect(respond).not.toHaveBeenCalled();
    expect(await usage()).toEqual([
      { scope: "installation", day: "2026-11-18", count: DAILY_CAP },
    ]);
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      provider: "unknown",
      model: "unknown",
      inputTokens: null,
      outputTokens: null,
      errorCode: "DAILY_CAP_REACHED",
    });
  });

  it("lets exactly 30 of 35 concurrent requests through", async () => {
    const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
    const results = await Promise.all(
      Array.from({ length: 35 }, () =>
        runAi(request(), accepted(), liveOptions(adapter)),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(DAILY_CAP);
    const refused = results.filter((r) => !r.ok);
    expect(refused).toHaveLength(5);
    for (const r of refused) {
      expect(!r.ok && r.error.code).toBe("DAILY_CAP_REACHED");
    }
    expect((await usage())[0]?.count).toBe(DAILY_CAP);
  });

  it.each([
    ["winter", "2026-01-15T22:59:59Z", "2026-01-15T23:00:00Z", "2026-01-16"],
    ["summer", "2026-07-15T21:59:59Z", "2026-07-15T22:00:00Z", "2026-07-16"],
  ])(
    "starts a new count at Oslo midnight in %s",
    async (_name, before, after, nextDay) => {
      const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
      const at = (iso: string) => () => new Date(iso);
      await runAi(request(), accepted(), liveOptions(adapter, at(before)));
      await runAi(request(), accepted(), liveOptions(adapter, at(before)));
      await runAi(request(), accepted(), liveOptions(adapter, at(after)));
      const rows = await usage();
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.day === nextDay)?.count).toBe(1);
      expect(rows.find((r) => r.day !== nextDay)?.count).toBe(2);
    },
  );

  it("keeps the count when the provider fails after the reservation", async () => {
    const adapter = createMockAdapter({ error: new Error(ERROR_SENTINEL) });
    const result = await runAi(request(), accepted(), liveOptions(adapter));
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_PROVIDER_ERROR", retryable: true },
    });
    expect((await usage())[0]?.count).toBe(1);
  });

  it("counts per student id and per installation", async () => {
    const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
    await runAi(request(), accepted("student-a"), liveOptions(adapter));
    await runAi(request(), accepted("student-a"), liveOptions(adapter));
    await runAi(request(), accepted("student-b"), liveOptions(adapter));
    await runAi(request(), accepted(null), liveOptions(adapter));
    expect(await usage()).toEqual([
      { scope: "installation", day: "2026-11-18", count: 1 },
      { scope: "student-a", day: "2026-11-18", count: 2 },
      { scope: "student-b", day: "2026-11-18", count: 1 },
    ]);
  });

  it("skips the notice and the cap in Test mode and writes no row", async () => {
    const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
    const result = await runAi(
      request(),
      { studentId: null, consent: null },
      { adapter, now: fixedNow, testMode: true },
    );
    expect(result.ok).toBe(true);
    expect(await usage()).toEqual([]);
  });
});

describe("NFR-8 the log holds no content on a notice or cap failure", () => {
  beforeEach(clearUsage);

  it("holds one AI event and no sentinel for each new code", async () => {
    const adapter = createMockAdapter({
      respond: () => ({ text: RESPONSE_SENTINEL }),
      error: new Error(`${ERROR_SENTINEL} ${CV_SENTINEL}`),
    });
    await runAi(request(), CTX, liveOptions(adapter));
    await (await getDb()).execute(
      sql`insert into ai_usage (scope, day, count) values ('installation', '2026-11-18', ${DAILY_CAP})`,
    );
    await runAi(request(), accepted(), liveOptions(adapter));
    const events = loggedEvents();
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.kind === "ai" && e.errorCode)).toEqual([
      "AI_NOTICE_REQUIRED",
      "DAILY_CAP_REACHED",
    ]);
    const written = JSON.stringify(events);
    for (const sentinel of [
      CV_SENTINEL,
      AD_SENTINEL,
      ERROR_SENTINEL,
      PROMPT_SENTINEL,
      RESPONSE_SENTINEL,
      "ola@example.no",
    ]) {
      expect(written).not.toContain(sentinel);
    }
  });
});

describe("FR-24 the production default for Test mode", () => {
  beforeEach(clearUsage);

  const configWith = (testMode: boolean) => ({
    ...getConfig(),
    testMode,
  });

  it("enforces the notice when options omit testMode and config says Test mode is off", async () => {
    const respond = vi.fn(() => ({ text: "x" }));
    const adapter = createMockAdapter({ respond });
    vi.mocked(getConfig).mockReturnValue(configWith(false));
    try {
      const result = await runAi(request(), CTX, { adapter, now: fixedNow });
      expect(result).toEqual({
        ok: false,
        error: { code: "AI_NOTICE_REQUIRED", retryable: false },
      });
    } finally {
      vi.mocked(getConfig).mockReset();
    }
    expect(respond).not.toHaveBeenCalled();
    expect(await usage()).toEqual([]);
  });

  it("skips the notice and the cap when options omit testMode and config says Test mode is on", async () => {
    const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
    vi.mocked(getConfig).mockReturnValue(configWith(true));
    try {
      const result = await runAi(request(), CTX, { adapter, now: fixedNow });
      expect(result.ok).toBe(true);
    } finally {
      vi.mocked(getConfig).mockReset();
    }
    expect(await usage()).toEqual([]);
  });
});

describe("AD-3 runAi builds the live adapter from the config", () => {
  beforeEach(clearUsage);

  const liveConfig = () => {
    const base = getConfig();
    return {
      ...base,
      testMode: false,
      isTestRun: false,
      ai: {
        adapter: "live" as const,
        provider: "openrouter",
        model: "vendor/model",
        apiKey: "SENTINEL-KEY-hemmelig",
      },
    };
  };

  it("hands the factory the config's AI settings when no adapter is passed", async () => {
    const config = liveConfig();
    vi.mocked(getConfig).mockReturnValue(config);
    vi.mocked(createAdapter).mockReturnValueOnce(
      createMockAdapter({ respond: () => ({ text: "x" }) }),
    );
    try {
      const result = await runAi(
        request(),
        {
          studentId: null,
          consent: { noticeVersion: config.aiNotice.version },
        },
        { now: fixedNow },
      );
      expect(result.ok).toBe(true);
    } finally {
      vi.mocked(getConfig).mockReset();
    }
    expect(createAdapter).toHaveBeenLastCalledWith("live", {
      isTestRun: false,
      live: config.ai,
    });
  });

  it("maps a live adapter failure to AI_PROVIDER_ERROR without its content", async () => {
    const config = liveConfig();
    vi.mocked(getConfig).mockReturnValue(config);
    vi.mocked(createAdapter).mockReturnValueOnce(
      createMockAdapter({ error: new AiProviderError("HTTP_500") }),
    );
    try {
      const result = await runAi(
        request(),
        {
          studentId: null,
          consent: { noticeVersion: config.aiNotice.version },
        },
        { now: fixedNow },
      );
      expect(result).toEqual({
        ok: false,
        error: { code: "AI_PROVIDER_ERROR", retryable: true },
      });
    } finally {
      vi.mocked(getConfig).mockReset();
    }
    expect(JSON.stringify(loggedEvents())).not.toContain("SENTINEL-KEY");
  });
});

describe("FR-25 the cap fails closed when the database fails", () => {
  it("rejects, never calls the adapter and logs one UNEXPECTED event", async () => {
    const respond = vi.fn(() => ({ text: "x" }));
    const adapter = createMockAdapter({ respond });
    vi.mocked(getDb).mockRejectedValueOnce(new Error(ERROR_SENTINEL));
    await expect(
      runAi(request(), accepted(), liveOptions(adapter)),
    ).rejects.toThrow(ERROR_SENTINEL);
    expect(respond).not.toHaveBeenCalled();
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      kind: "ai",
      errorCode: "UNEXPECTED",
    });
    expect(JSON.stringify(loggedEvents())).not.toContain(ERROR_SENTINEL);
  });
});

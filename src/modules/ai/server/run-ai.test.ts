import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { log } from "@/shared/server/log";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

import { createMockAdapter } from "./adapters/mock";
import { type AiRequest, runAi } from "./run-ai";

const schema = z.object({ text: z.string() });
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

const options = (adapter: ReturnType<typeof createMockAdapter>) => ({
  adapter,
  now: fixedNow,
});

function loggedEvents() {
  return vi.mocked(log).mock.calls.map(([event]) => event);
}

beforeEach(() => {
  vi.mocked(log).mockClear();
});

describe("AD-13 runAi success", () => {
  it("returns data, meta and the sent CV text, and logs one event with counts", async () => {
    const adapter = createMockAdapter({
      respond: () => ({ text: RESPONSE_SENTINEL }),
      usage: { inputTokens: 120, outputTokens: 45 },
    });
    const result = await runAi(request(), {}, options(adapter));
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
    await runAi(request(), {}, options(adapter));
    expect(seen.lookupKey).toMatch(/^[0-9a-f]{64}$/);
    expect(seen.maxRetries).toBe(0);
    expect(seen.signal.aborted).toBe(false);
  });

  it("makes the key from the unstripped inputs", async () => {
    const keys: string[] = [];
    const adapter = createMockAdapter({
      respond: (args) => {
        keys.push(args.lookupKey);
        return { text: "x" };
      },
    });
    await runAi(request(), {}, options(adapter));
    await runAi(request({ cvText: "ola@example.no" }), {}, options(adapter));
    await runAi(request({ cvText: "" }), {}, options(adapter));
    expect(new Set(keys).size).toBe(3);
  });
});

describe("AD-13 runAi result and clock", () => {
  it("returns the schema-parsed value as data", async () => {
    const adapter = createMockAdapter({
      respond: () => ({ text: "x", extra: "y" }),
    });
    const result = await runAi(request(), {}, options(adapter));
    expect(result.ok && result.value.data).toEqual({ text: "x" });
  });

  it("logs the elapsed time from the injected clock", async () => {
    let calls = 0;
    const now = () =>
      new Date(Date.UTC(2026, 10, 18) + (calls++ === 0 ? 0 : 250));
    const adapter = createMockAdapter({ respond: () => ({ text: "x" }) });
    await runAi(request(), {}, { adapter, now });
    expect(loggedEvents()[0]).toMatchObject({ kind: "ai", durationMs: 250 });
  });

  it("logs UNEXPECTED once and rethrows when the default adapter is unavailable", async () => {
    await expect(runAi(request(), {}, { now: fixedNow })).rejects.toThrow(
      /not built yet/,
    );
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      kind: "ai",
      errorCode: "UNEXPECTED",
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
    const result = await runAi(request(), {}, options(adapter));
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
      {},
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
    const result = await runAi(
      request(),
      {},
      {
        adapter,
        now: fixedNow,
        timeoutMs: 30,
      },
    );
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
    const result = await runAi(
      request(),
      {},
      {
        adapter,
        now: fixedNow,
        timeoutMs: 30,
      },
    );
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
    await runAi(request(), {}, { adapter, now: fixedNow, timeoutMs: 20 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("maps a provider failure to AI_PROVIDER_ERROR without CV text in the log", async () => {
    const adapter = createMockAdapter({
      error: new Error(`${ERROR_SENTINEL} ${CV_SENTINEL}`),
    });
    const result = await runAi(request(), {}, options(adapter));
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_PROVIDER_ERROR", retryable: true },
    });
    expect(loggedEvents()).toHaveLength(1);
    expect(loggedEvents()[0]).toMatchObject({
      errorCode: "AI_PROVIDER_ERROR",
    });
  });

  it("maps a bad shape to AI_PROVIDER_ERROR and logs once", async () => {
    const adapter = createMockAdapter({
      respond: () => ({ text: 42, extra: RESPONSE_SENTINEL }),
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    const result = await runAi(request(), {}, options(adapter));
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
        {},
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
      await runAi(request(), {}, options(adapter));
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

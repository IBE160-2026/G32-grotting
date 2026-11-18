import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { log } from "@/shared/server/log";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

import { createAdapter } from "./factory";
import {
  AiProviderError,
  createLiveAdapter,
  type ModelFactory,
  OPENROUTER_PRIVACY,
  openRouterModel,
} from "./live";

const KEY = "SENTINEL-KEY-sk-hemmelig";
const PROMPT = "SENTINEL-PROMPT-instruks med CV-tekst";
const RESPONSE = "SENTINEL-RESPONSE-svar fra modellen";

const schema = z.object({ text: z.string() });
const settings = {
  provider: "openrouter",
  model: "vendor/model",
  apiKey: KEY,
};

type Generate = NonNullable<
  ConstructorParameters<typeof MockLanguageModelV4>[0]
>["doGenerate"];

const reply = (text: string, input?: number, output?: number) => ({
  content: [{ type: "text" as const, text }],
  finishReason: { unified: "stop" as const, raw: undefined },
  usage: {
    inputTokens: {
      total: input,
      noCache: input,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: output, text: output, reasoning: undefined },
  },
  warnings: [],
});

function adapterOver(doGenerate: Generate) {
  const model = new MockLanguageModelV4({ doGenerate });
  const factory: ModelFactory = () => model;
  return { adapter: createLiveAdapter(settings, factory), model };
}

const args = (
  overrides: { signal?: AbortSignal; maxRetries?: number } = {},
) => ({
  prompt: PROMPT,
  lookupKey: "k",
  signal: overrides.signal ?? new AbortController().signal,
  maxRetries: overrides.maxRetries ?? 0,
  schema,
});

afterEach(() => vi.restoreAllMocks());

describe("AD-3 createAdapter for live", () => {
  it("throws in a test run, before it looks at the settings", () => {
    expect(() =>
      createAdapter("live", { isTestRun: true, live: settings }),
    ).toThrow(/test run/);
  });

  it("builds an adapter from the settings outside a test run", () => {
    const adapter = createAdapter("live", {
      isTestRun: false,
      live: settings,
    });
    expect(adapter).toMatchObject({
      kind: "live",
      provider: "openrouter",
      model: "vendor/model",
    });
  });

  it("rejects the removed direct providers with the plain error", () => {
    for (const provider of ["anthropic", "openai"]) {
      const run = () =>
        createAdapter("live", {
          isTestRun: false,
          live: { ...settings, provider },
        });
      expect(run).toThrow(`does not support the provider «${provider}»`);
      expect(run).not.toThrow(KEY);
    }
  });

  it("throws a plain error naming the missing field, never the key", () => {
    const cases: [Partial<typeof settings>, RegExp][] = [
      [{ provider: undefined }, /provider/],
      [{ model: undefined }, /model/],
      [{ apiKey: undefined }, /API key/],
      [{ provider: "foo" }, /«foo»/],
    ];
    for (const [change, pattern] of cases) {
      const run = () =>
        createAdapter("live", {
          isTestRun: false,
          live: { ...settings, ...change },
        });
      expect(run).toThrow(pattern);
      expect(run).not.toThrow(KEY);
    }
    expect(() => createAdapter("live", { isTestRun: false })).toThrow(
      /provider/,
    );
  });
});

describe("AD-3 live adapter", () => {
  it("returns the raw object with token counts from the model", async () => {
    const { adapter } = adapterOver(
      reply(JSON.stringify({ text: "Hei" }), 120, 30),
    );
    expect(await adapter.generate(args())).toEqual({
      output: { text: "Hei" },
      usage: { inputTokens: 120, outputTokens: 30 },
    });
  });

  it("maps missing usage to null", async () => {
    const { adapter } = adapterOver(reply(JSON.stringify({ text: "Hei" })));
    expect((await adapter.generate(args())).usage).toEqual({
      inputTokens: null,
      outputTokens: null,
    });
  });

  it("sends the prompt, the abort signal and the schema to the model", async () => {
    const { adapter, model } = adapterOver(
      reply(JSON.stringify({ text: "Hei" }), 1, 1),
    );
    const controller = new AbortController();
    await adapter.generate(args({ signal: controller.signal }));
    const call = model.doGenerateCalls[0];
    expect(JSON.stringify(call?.prompt)).toContain(PROMPT);
    expect(call?.responseFormat).toMatchObject({ type: "json" });
    const sent = call?.responseFormat;
    expect(sent?.type === "json" ? JSON.stringify(sent.schema) : "").toContain(
      '"text"',
    );
    expect(call?.abortSignal).toBeDefined();
  });

  it("rejects a shape mismatch with AiProviderError and the code SCHEMA_MISMATCH", async () => {
    const { adapter } = adapterOver(
      reply(JSON.stringify({ other: RESPONSE }), 1, 1),
    );
    const failure = await adapter.generate(args()).catch((error) => error);
    expect(failure).toBeInstanceOf(AiProviderError);
    expect(failure.code).toBe("SCHEMA_MISMATCH");
    expect(failure.message).not.toContain(RESPONSE);
  });

  it("passes maxRetries as given: 0 means one call", async () => {
    const doGenerate = vi.fn(async () => {
      throw new APICallError({
        message: "boom",
        url: "https://example.invalid",
        requestBodyValues: {},
        statusCode: 503,
        isRetryable: true,
      });
    });
    const { adapter } = adapterOver(doGenerate);
    await expect(adapter.generate(args({ maxRetries: 0 }))).rejects.toThrow();
    expect(doGenerate).toHaveBeenCalledTimes(1);
  });

  it("rejects with a generic error that holds no key, prompt or response", async () => {
    const logs = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(process.stdout, "write").mockImplementation(() => true),
      vi.spyOn(process.stderr, "write").mockImplementation(() => true),
    ];
    const { adapter } = adapterOver(async () => {
      throw new APICallError({
        message: `Rejected: ${PROMPT} / ${KEY}`,
        url: "https://example.invalid",
        requestBodyValues: { prompt: PROMPT },
        statusCode: 401,
        responseBody: RESPONSE,
        isRetryable: false,
      });
    });
    const failure = await adapter.generate(args()).catch((error) => error);
    expect(failure).toBeInstanceOf(AiProviderError);
    expect(failure.code).toBe("HTTP_401");
    const everything = [
      failure.message,
      failure.stack,
      JSON.stringify(failure),
      String(failure.cause),
      ...vi.mocked(log).mock.calls.map((call) => JSON.stringify(call)),
      ...logs.flatMap((spy) => spy.mock.calls.map((c) => JSON.stringify(c))),
    ].join("\n");
    for (const secret of [KEY, PROMPT, RESPONSE]) {
      expect(everything).not.toContain(secret);
    }
    expect(failure.cause).toBeUndefined();
  });

  it("rejects when the signal aborts, with the code ABORTED", async () => {
    const controller = new AbortController();
    let started!: () => void;
    const hasStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const { adapter } = adapterOver(
      (options) =>
        new Promise((_resolve, reject) => {
          options.abortSignal?.addEventListener("abort", () =>
            reject(new Error(`aborted ${PROMPT}`)),
          );
          started();
        }),
    );
    const pending = adapter.generate(args({ signal: controller.signal }));
    await hasStarted;
    controller.abort();
    const failure = await pending.catch((error) => error);
    expect(failure).toBeInstanceOf(AiProviderError);
    expect(failure.code).toBe("ABORTED");
    expect(failure.message).not.toContain(PROMPT);
  });

  it("gives any other failure the code PROVIDER_ERROR", async () => {
    const { adapter } = adapterOver(async () => {
      throw new Error(PROMPT);
    });
    const failure = await adapter.generate(args()).catch((error) => error);
    expect(failure.code).toBe("PROVIDER_ERROR");
  });
});

describe("NFR-8 OpenRouter adapter", () => {
  const openRouterSettings = {
    provider: "openrouter",
    model: "vendor/model",
    apiKey: KEY,
  };

  // A stand-in for fetch: records the request, makes no network call.
  function stubFetch(respond: () => Response) {
    const calls: { url: string; body: unknown; headers: Headers }[] = [];
    const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body)),
        headers: new Headers(init?.headers),
      });
      return respond();
    }) as typeof fetch;
    return { calls, fetchStub };
  }

  const providerOf = (call: { body: unknown } | undefined) =>
    (call?.body as { provider?: unknown } | undefined)?.provider;

  const completion = (content: string) =>
    new Response(
      JSON.stringify({
        id: "gen-1",
        object: "chat.completion",
        created: 1,
        model: "vendor/model",
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: { role: "assistant", content },
          },
        ],
        usage: { prompt_tokens: 40, completion_tokens: 12, total_tokens: 52 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const adapterOverFetch = (fetchStub: typeof fetch) =>
    createLiveAdapter(openRouterSettings, ({ model, apiKey }) =>
      openRouterModel({ model, apiKey, fetch: fetchStub }),
    );

  it("asks OpenRouter for providers that do not collect data and keep none", async () => {
    const { calls, fetchStub } = stubFetch(() =>
      completion(JSON.stringify({ text: "Hei" })),
    );
    const result = await adapterOverFetch(fetchStub).generate(args());
    expect(result).toEqual({
      output: { text: "Hei" },
      usage: { inputTokens: 40, outputTokens: 12 },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("openrouter.ai");
    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${KEY}`);
    expect(calls[0]?.body).toMatchObject({ model: "vendor/model" });
    expect(providerOf(calls[0])).toEqual({
      data_collection: "deny",
      zdr: true,
    });
    expect(OPENROUTER_PRIVACY).toEqual({ data_collection: "deny", zdr: true });
  });

  it("sends the same restriction through the default wiring", async () => {
    const { calls, fetchStub } = stubFetch(() =>
      completion(JSON.stringify({ text: "Hei" })),
    );
    const original = globalThis.fetch;
    globalThis.fetch = fetchStub;
    try {
      // No model factory argument: the adapter builds its own model.
      await createLiveAdapter(openRouterSettings).generate(args());
    } finally {
      globalThis.fetch = original;
    }
    expect(calls).toHaveLength(1);
    expect(providerOf(calls[0])).toEqual({
      data_collection: "deny",
      zdr: true,
    });
  });

  it("rejects with a generic error that holds no key, prompt or response", async () => {
    const { fetchStub } = stubFetch(
      () =>
        new Response(
          JSON.stringify({
            error: { message: `Rejected: ${PROMPT} / ${KEY} / ${RESPONSE}` },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        ),
    );
    const failure = await adapterOverFetch(fetchStub)
      .generate(args())
      .catch((error) => error);
    expect(failure).toBeInstanceOf(AiProviderError);
    expect(failure.code).toBe("HTTP_401");
    const everything = [
      failure.message,
      failure.stack,
      JSON.stringify(failure),
    ].join("\n");
    for (const secret of [KEY, PROMPT, RESPONSE]) {
      expect(everything).not.toContain(secret);
    }
    expect(failure.cause).toBeUndefined();
  });
});

describe("AD-13 live adapter through runAi", () => {
  it("validates the raw object, and maps an abort to AI_TIMEOUT", async () => {
    const { runAi } = await import("../run-ai");
    const request = {
      task: "letter",
      jobAd: "annonse",
      promptVersion: "v1",
      buildPrompt: () => PROMPT,
      schema,
    };
    const ctx = { studentId: null, consent: null };

    const good = adapterOver(reply(JSON.stringify({ text: "Hei" }), 5, 6));
    const ok = await runAi(request, ctx, {
      adapter: good.adapter,
      testMode: true,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.data).toEqual({ text: "Hei" });
      expect(ok.value.meta).toMatchObject({
        source: "live",
        provider: "openrouter",
        model: "vendor/model",
      });
    }

    const slow = adapterOver(
      (options) =>
        new Promise((_resolve, reject) => {
          options.abortSignal?.addEventListener("abort", () =>
            reject(new Error("x")),
          );
        }),
    );
    const timedOut = await runAi(request, ctx, {
      adapter: slow.adapter,
      testMode: true,
      timeoutMs: 20,
    });
    expect(timedOut.ok).toBe(false);
    if (!timedOut.ok) expect(timedOut.error.code).toBe("AI_TIMEOUT");
  });
});

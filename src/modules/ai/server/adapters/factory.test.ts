import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAdapter } from "./factory";
import { createMockAdapter } from "./mock";

describe("AD-3 createAdapter", () => {
  it("refuses live in a test run", () => {
    expect(() => createAdapter("live", { isTestRun: true })).toThrow(
      /test run/,
    );
  });

  it("needs the live settings outside a test run", () => {
    expect(() => createAdapter("live", { isTestRun: false })).toThrow(
      /provider/,
    );
  });

  it("returns the cached adapter", () => {
    const adapter = createAdapter("cached", { isTestRun: true });
    expect(adapter.kind).toBe("cached");
    expect(adapter.provider).toBe("cached");
  });

  it("returns the mock adapter", () => {
    const adapter = createAdapter("mock", { isTestRun: true });
    expect(adapter.kind).toBe("mock");
    expect(adapter.provider).toBe("mock");
  });
});

describe("AD-3 mock adapter", () => {
  const args = {
    prompt: "abcdefgh",
    lookupKey: "k",
    signal: new AbortController().signal,
    maxRetries: 0,
    schema: z.unknown(),
  };

  it("is deterministic and reports token counts", async () => {
    const adapter = createMockAdapter();
    const first = await adapter.generate(args);
    expect(await adapter.generate(args)).toEqual(first);
    expect(first.usage.inputTokens).toBe(2);
    expect(first.usage.outputTokens).toBeGreaterThan(0);
  });

  it("answers with the configured output and counts", async () => {
    const adapter = createMockAdapter({
      respond: () => ({ text: "hei" }),
      usage: { inputTokens: 7, outputTokens: 9 },
    });
    expect(await adapter.generate(args)).toEqual({
      output: { text: "hei" },
      usage: { inputTokens: 7, outputTokens: 9 },
    });
  });

  it("rejects at once when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter = createMockAdapter({ delayMs: 5000 });
    await expect(
      adapter.generate({ ...args, signal: controller.signal }),
    ).rejects.toThrow("aborted");
  });

  it("removes its abort listener when the delay completes", async () => {
    const signal = new AbortController().signal;
    const remove = vi.spyOn(signal, "removeEventListener");
    const adapter = createMockAdapter({ delayMs: 5 });
    await adapter.generate({ ...args, signal });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("rejects with the configured error", async () => {
    const adapter = createMockAdapter({ error: new Error("nope") });
    await expect(adapter.generate(args)).rejects.toThrow("nope");
  });
});

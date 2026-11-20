import type { z } from "zod";
import type { AiSource } from "../../contracts";
import { sharedCachedAdapter } from "./cached";
import { createLiveAdapter, type LiveSettings } from "./live";
import { createMockAdapter } from "./mock";

export type AiUsage = {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
};

export type AiGenerateArgs = {
  // What the request is for (`AiRequest.task`): the cached adapter keeps its
  // Keyword lists apart from its Letters.
  readonly task?: string;
  readonly prompt: string;
  readonly lookupKey: string;
  readonly signal: AbortSignal;
  readonly maxRetries: number;
  readonly schema: z.ZodType;
};

// The port every adapter implements (AD-3). It returns the raw output; only
// `runAi` validates it, so every task fails the same way.
export type AiAdapterPort = {
  readonly kind: AiSource;
  readonly provider: string;
  readonly model: string;
  generate(
    args: AiGenerateArgs,
  ): Promise<{ readonly output: unknown; readonly usage: AiUsage }>;
};

// A test run can never reach a paid provider: `live` throws (AD-3).
export function createAdapter(
  kind: AiSource,
  options: { isTestRun: boolean; live?: LiveSettings },
): AiAdapterPort {
  switch (kind) {
    case "live":
      if (options.isTestRun) {
        throw new Error("The live AI adapter is not available in a test run");
      }
      return createLiveAdapter(
        options.live ?? {
          provider: undefined,
          model: undefined,
          apiKey: undefined,
        },
      );
    case "cached":
      return sharedCachedAdapter();
    case "mock":
      return createMockAdapter();
  }
}

import type { z } from "zod";
import type { AiSource } from "../../contracts";
import { createMockAdapter } from "./mock";

export type AiUsage = {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
};

export type AiGenerateArgs = {
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
  options: { isTestRun: boolean },
): AiAdapterPort {
  switch (kind) {
    case "live":
      if (options.isTestRun) {
        throw new Error("The live AI adapter is not available in a test run");
      }
      throw new Error("The live AI adapter is not built yet (Story 3.3)");
    case "cached":
      throw new Error("The cached AI adapter is not built yet (Story 3.5)");
    case "mock":
      return createMockAdapter();
  }
}

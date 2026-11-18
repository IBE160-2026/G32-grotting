import type { AiAdapterPort, AiGenerateArgs } from "./factory";

export type MockAdapterOptions = {
  // The raw output for a request. Default: a fixed object.
  readonly respond?: (args: AiGenerateArgs) => unknown;
  // Fixed counts; default: a rough one token per four characters.
  readonly usage?: {
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
  };
  // Waits before answering; rejects at once when the signal aborts first.
  readonly delayMs?: number;
  // Makes `generate` reject with this error.
  readonly error?: Error;
};

const tokensOf = (text: string) => Math.ceil(text.length / 4);

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

// Deterministic: the same prompt gives the same output and counts. It makes no
// network call.
export function createMockAdapter(
  options: MockAdapterOptions = {},
): AiAdapterPort {
  return {
    kind: "mock",
    provider: "mock",
    model: "mock-1",
    async generate(args) {
      if (options.delayMs !== undefined) {
        await wait(options.delayMs, args.signal);
      }
      if (options.error !== undefined) throw options.error;
      const output = options.respond ? options.respond(args) : { mock: true };
      return {
        output,
        usage: options.usage ?? {
          inputTokens: tokensOf(args.prompt),
          outputTokens: tokensOf(JSON.stringify(output) ?? ""),
        },
      };
    },
  };
}

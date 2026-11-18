import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  APICallError,
  generateText,
  type LanguageModel,
  NoObjectGeneratedError,
  Output,
  TypeValidationError,
} from "ai";
import type { AiAdapterPort } from "./factory";

export const LIVE_PROVIDERS = ["anthropic", "openai"] as const;
export type LiveProvider = (typeof LIVE_PROVIDERS)[number];

// The settings a live adapter is built from (`config.ai`). The key never leaves
// this file: it is not logged, not stored and not put in an error.
export type LiveSettings = {
  readonly provider: string | undefined;
  readonly model: string | undefined;
  readonly apiKey: string | undefined;
};

// Gives the adapter its model. Tests pass the SDK's mock language model so no
// request ever leaves the process.
export type ModelFactory = (settings: {
  readonly provider: LiveProvider;
  readonly model: string;
  readonly apiKey: string;
}) => LanguageModel;

export const defaultModelFactory: ModelFactory = ({
  provider,
  model,
  apiKey,
}) =>
  provider === "anthropic"
    ? createAnthropic({ apiKey })(model)
    : createOpenAI({ apiKey })(model);

// A failed provider call. The message is fixed text: the SDK's own message can
// hold the prompt, the response or the key, so it is never copied. `code` says
// only what kind of failure it was, for the Bake-off record.
export class AiProviderError extends Error {
  readonly code: string;
  constructor(code: string) {
    super("The AI provider request failed");
    this.name = "AiProviderError";
    this.code = code;
  }
}

function codeOf(error: unknown, signal: AbortSignal): string {
  if (signal.aborted) return "ABORTED";
  // The SDK checks structured output against the schema and rejects.
  if (
    NoObjectGeneratedError.isInstance(error) ||
    TypeValidationError.isInstance(error)
  ) {
    return "SCHEMA_MISMATCH";
  }
  if (APICallError.isInstance(error) && error.statusCode !== undefined) {
    return `HTTP_${error.statusCode}`;
  }
  return "PROVIDER_ERROR";
}

const isLiveProvider = (value: string): value is LiveProvider =>
  (LIVE_PROVIDERS as readonly string[]).includes(value);

// Selects the provider by name, so one setting (`AI_PROVIDER`) switches between
// the two Bake-off contenders (AD-3). Throws a plain error naming the field.
export function createLiveAdapter(
  settings: LiveSettings,
  modelFactory: ModelFactory = defaultModelFactory,
): AiAdapterPort {
  const { provider, model, apiKey } = settings;
  if (provider === undefined || provider === "") {
    throw new Error("The live AI adapter needs a provider");
  }
  if (!isLiveProvider(provider)) {
    throw new Error(
      `The live AI adapter does not support the provider «${provider}»`,
    );
  }
  if (model === undefined || model === "") {
    throw new Error("The live AI adapter needs a model");
  }
  if (apiKey === undefined || apiKey === "") {
    throw new Error("The live AI adapter needs an API key");
  }
  const languageModel = modelFactory({ provider, model, apiKey });

  return {
    kind: "live",
    provider,
    model,
    async generate(args) {
      try {
        const result = await generateText({
          model: languageModel,
          prompt: args.prompt,
          output: Output.object({ schema: args.schema }),
          abortSignal: args.signal,
          maxRetries: args.maxRetries,
        });
        return {
          output: result.output,
          usage: {
            inputTokens: result.usage.inputTokens ?? null,
            outputTokens: result.usage.outputTokens ?? null,
          },
        };
      } catch (error) {
        throw new AiProviderError(codeOf(error, args.signal));
      }
    },
  };
}

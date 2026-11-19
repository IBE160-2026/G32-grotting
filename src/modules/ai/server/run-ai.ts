import type { z } from "zod";
import type { MessageKey } from "@/shared/core/message-key";
import { err, ok, type Result } from "@/shared/core/result";
import { osloDay } from "@/shared/core/time";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { log } from "@/shared/server/log";
import type { AiConsent, AiOutput } from "../contracts";
import { lookupKeyOf } from "../core/lookup-key";
import { stripContactDetails } from "../core/strip-contact";
import { CachedMissError } from "./adapters/cached";
import {
  type AiAdapterPort,
  type AiUsage,
  createAdapter,
} from "./adapters/factory";
import { reserveRequest } from "./daily-cap";

export const AI_TIMEOUT_MS = 90_000;

export type AiRequest<T> = {
  readonly task: string;
  readonly cvText?: string;
  readonly jobAd: string;
  readonly tone?: string;
  readonly jobTitle?: string;
  readonly employer?: string;
  // The prompts live in the slices (AD-15); the version goes into `meta`.
  readonly promptVersion: string;
  // A slice never passes a finished prompt: it builds it from the stripped CV.
  readonly buildPrompt: (sentCvText: string) => string;
  readonly schema: z.ZodType<T>;
};

// Who asks and what they have accepted. The cap scope is derived from here
// (`studentId ?? 'installation'`) and never passed by a caller.
export type AiContext = {
  readonly studentId: string | null;
  readonly consent: AiConsent | null;
};

export type AiFailure = {
  readonly code: Extract<
    MessageKey,
    | "AI_TIMEOUT"
    | "AI_PROVIDER_ERROR"
    | "AI_NOTICE_REQUIRED"
    | "DAILY_CAP_REACHED"
    | "TEST_MODE_UNAVAILABLE"
  >;
  // Only a timeout or a provider error is worth another try; a Test-mode miss
  // is final (the input is not a recorded Fixture).
  readonly retryable: boolean;
};

const RETRYABLE: ReadonlySet<AiFailure["code"]> = new Set([
  "AI_TIMEOUT",
  "AI_PROVIDER_ERROR",
]);

const INSTALLATION_SCOPE = "installation";

export type AiRunResult<T> = Result<
  AiOutput<T> & { readonly sentCvText: string },
  AiFailure
>;

// A test seam: the default adapter and Test mode come from the config. A test
// runs the mock adapter with `testMode: false`; no setting selects `mock`.
export type AiRunOptions = {
  readonly adapter?: AiAdapterPort;
  readonly testMode?: boolean;
  readonly now?: () => Date;
  readonly timeoutMs?: number;
};

const NO_USAGE: AiUsage = { inputTokens: null, outputTokens: null };
const TIMED_OUT = Symbol("timed out");

/**
 * The only way to reach an AI provider (AD-13). Story 3.1 builds the lookup key,
 * the contact stripping, the adapter call with its 90 s limit and no retries,
 * the shape check and the one log event. Story 3.2 adds the notice check and
 * the Daily cap reservation, both skipped in Test mode.
 */
export async function runAi<T>(
  request: AiRequest<T>,
  ctx: AiContext,
  options: AiRunOptions = {},
): Promise<AiRunResult<T>> {
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const started = startedAt.getTime();
  let provider = "unknown";
  let model = "unknown";

  const finish = (errorCode: MessageKey | null, usage: AiUsage) =>
    log({
      kind: "ai",
      task: request.task,
      provider,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      durationMs: now().getTime() - started,
      errorCode,
    });
  const fail = (code: AiFailure["code"], usage: AiUsage): AiRunResult<T> => {
    finish(code, usage);
    return err({ code, retryable: RETRYABLE.has(code) });
  };

  let logged = false;
  try {
    const lookupKey = lookupKeyOf(request);

    const testMode = options.testMode ?? getConfig().testMode;
    if (!testMode) {
      // Step 2: the notice. Step 3: one atomic reservation, never refunded.
      if (ctx.consent?.noticeVersion !== getConfig().aiNotice.version) {
        logged = true;
        return fail("AI_NOTICE_REQUIRED", NO_USAGE);
      }
      const reserved = await reserveRequest(
        await getDb(),
        ctx.studentId ?? INSTALLATION_SCOPE,
        osloDay(startedAt),
      );
      if (!reserved) {
        logged = true;
        return fail("DAILY_CAP_REACHED", NO_USAGE);
      }
    }

    const sentCvText =
      request.cvText === undefined ? "" : stripContactDetails(request.cvText);
    const prompt = request.buildPrompt(sentCvText);
    const adapter =
      options.adapter ??
      createAdapter(getConfig().ai.adapter, {
        isTestRun: getConfig().isTestRun,
        live: getConfig().ai,
      });
    provider = adapter.provider;
    model = adapter.model;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(TIMED_OUT);
      }, options.timeoutMs ?? AI_TIMEOUT_MS);
    });
    // Racing the promise against the limit ends the request on time even when
    // the adapter ignores the signal. A late failure must not become an
    // unhandled rejection.
    const pending = (async () =>
      adapter.generate({
        prompt,
        lookupKey,
        signal: controller.signal,
        maxRetries: 0,
        schema: request.schema,
      }))();
    pending.catch(() => undefined);

    let generated: Awaited<typeof pending> | typeof TIMED_OUT;
    try {
      generated = await Promise.race([pending, timedOut]);
    } catch (error) {
      logged = true;
      if (error instanceof CachedMissError) {
        return fail("TEST_MODE_UNAVAILABLE", NO_USAGE);
      }
      return fail(
        controller.signal.aborted ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
        NO_USAGE,
      );
    } finally {
      clearTimeout(timer);
    }
    if (generated === TIMED_OUT) {
      logged = true;
      return fail("AI_TIMEOUT", NO_USAGE);
    }

    const parsed = request.schema.safeParse(generated.output);
    logged = true;
    if (!parsed.success) return fail("AI_PROVIDER_ERROR", generated.usage);

    finish(null, generated.usage);
    return ok({
      data: parsed.data,
      meta: {
        source: adapter.kind,
        provider: adapter.provider,
        model: adapter.model,
        promptVersion: request.promptVersion,
        createdAt: now().toISOString(),
      },
      sentCvText,
    });
  } catch (error) {
    // Not an adapter failure (for example `buildPrompt` threw): log once, with
    // no message, and let the handler answer.
    if (!logged) finish("UNEXPECTED", NO_USAGE);
    throw error;
  }
}

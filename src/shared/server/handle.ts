import "server-only";
import { ZodError } from "zod";
import type { MessageKey } from "@/shared/core/message-key";
import { log } from "./log";

export const errorStatus: Record<MessageKey, number> = {
  INVALID_INPUT: 400,
  SESSION_EXPIRED: 401,
  ACCESS_REQUIRED: 401,
  NOT_FOUND: 404,
  ANALYSIS_STALE: 409,
  DAILY_CAP_REACHED: 429,
  AI_TIMEOUT: 502,
  AI_PROVIDER_ERROR: 502,
  TEST_MODE_UNAVAILABLE: 502,
  AI_NOTICE_REQUIRED: 403,
  NETWORK_ERROR: 500,
  UNEXPECTED: 500,
};

export class ApiError extends Error {
  readonly code: MessageKey;
  readonly field?: string;
  readonly retryable: boolean;

  constructor(
    code: MessageKey,
    options: { field?: string; retryable?: boolean } = {},
  ) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.field = options.field;
    this.retryable = options.retryable ?? false;
  }
}

type ErrorBody = {
  ok: false;
  error: { code: MessageKey; field?: string; retryable: boolean };
};

function failure(
  code: MessageKey,
  retryable: boolean,
  field?: string,
): Response {
  const body: ErrorBody = { ok: false, error: { code, field, retryable } };
  return Response.json(body, { status: errorStatus[code] });
}

// Wraps a route handler in the AD-7 envelope. Nothing the handler throws
// reaches the client or the log except its code and error name.
export function handle<T>(
  route: string,
  fn: (request: Request) => Promise<T> | T,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      return Response.json({ ok: true, data: await fn(request) });
    } catch (error) {
      if (error instanceof ZodError) {
        const path = error.issues[0]?.path ?? [];
        const field = path.length > 0 ? path.map(String).join(".") : undefined;
        return failure("INVALID_INPUT", false, field);
      }
      if (error instanceof ApiError) {
        log({ kind: "error", code: error.code, errorName: error.name, route });
        return failure(error.code, error.retryable, error.field);
      }
      const errorName = error instanceof Error ? error.name : "NonError";
      log({ kind: "error", code: "UNEXPECTED", errorName, route });
      return failure("UNEXPECTED", false);
    }
  };
}

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

// The failure envelope, also used by the Access-code proxy (AD-12).
export function errorResponse(
  code: MessageKey,
  retryable: boolean,
  field?: string,
): Response {
  const body: ErrorBody = { ok: false, error: { code, field, retryable } };
  return Response.json(body, { status: errorStatus[code] });
}

// The header every authenticated response carries (AD-12): when the session
// ends, as an ISO 8601 instant. The client times its expiry warning from it.
export const SESSION_EXPIRES_HEADER = "X-Session-Expires-At";

// What a handler gets besides the request: the session its `authenticate`
// found (`undefined` for a route with none) and headers (a `Set-Cookie`) that
// are copied onto its success response. A handler may set
// `X-Session-Expires-At` itself and so override the one `handle` adds.
export type HandlerContext<S> = {
  readonly session: S;
  readonly responseHeaders: Headers;
};

export type HandleOptions<S> = {
  // Throws `ApiError("SESSION_EXPIRED")` (or NOT_FOUND) when the request has no
  // live session. The kernel never imports a slice: the slice supplies this.
  readonly authenticate?: (
    request: Request,
  ) => Promise<{ session: S; expiresAt: Date }>;
};

// Wraps a route handler in the AD-7 envelope. Nothing the handler throws
// reaches the client or the log except its code and error name.
export function handle<T, S = undefined>(
  route: string,
  fn: (request: Request, ctx: HandlerContext<S>) => Promise<T> | T,
  options: HandleOptions<S> = {},
): (request: Request) => Promise<Response> {
  return async (request) => {
    const responseHeaders = new Headers();
    let expiresAt: Date | undefined;
    // Marks the session's end on a response, an error response too. A value
    // the handler set itself (renew) wins over the one found by `authenticate`.
    const withExpiry = (response: Response): Response => {
      const override = responseHeaders.get(SESSION_EXPIRES_HEADER);
      if (override !== null) {
        response.headers.set(SESSION_EXPIRES_HEADER, override);
      } else if (expiresAt !== undefined) {
        response.headers.set(SESSION_EXPIRES_HEADER, expiresAt.toISOString());
      }
      return response;
    };
    try {
      let session = undefined as S;
      if (options.authenticate !== undefined) {
        const authenticated = await options.authenticate(request);
        session = authenticated.session;
        expiresAt = authenticated.expiresAt;
      }
      const data = await fn(request, { session, responseHeaders });
      const response = Response.json({ ok: true, data });
      for (const [name, value] of responseHeaders) {
        response.headers.append(name, value);
      }
      return withExpiry(response);
    } catch (error) {
      return withExpiry(failure(route, error));
    }
  };
}

function failure(route: string, error: unknown): Response {
  if (error instanceof ZodError) {
    const path = error.issues[0]?.path ?? [];
    const field = path.length > 0 ? path.map(String).join(".") : undefined;
    return errorResponse("INVALID_INPUT", false, field);
  }
  if (error instanceof ApiError) {
    log({ kind: "error", code: error.code, errorName: error.name, route });
    return errorResponse(error.code, error.retryable, error.field);
  }
  const errorName = error instanceof Error ? error.name : "NonError";
  log({ kind: "error", code: "UNEXPECTED", errorName, route });
  return errorResponse("UNEXPECTED", false);
}

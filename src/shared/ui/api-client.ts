import { z } from "zod";
import { MESSAGE_KEYS, type MessageKey } from "@/shared/core/message-key";
import { noteSessionHeaders } from "./session-clock";
import { endSession } from "./session-end";

export type ApiFailure = {
  readonly code: MessageKey;
  readonly field?: string;
  readonly retryable: boolean;
};

export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ApiFailure };

const failureSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.enum(MESSAGE_KEYS),
    field: z.string().optional(),
    retryable: z.boolean(),
  }),
});

function fail(code: MessageKey, retryable: boolean): ApiResult<never> {
  return { ok: false, error: { code, retryable } };
}

// The one way a client component calls an API route (AD-7). It parses the
// envelope with the route's schema for `data`. A failed fetch or a body that
// is not JSON is NETWORK_ERROR; JSON that is not the envelope is UNEXPECTED.
// A request that never answers ends as NETWORK_ERROR, so a busy button frees.
export const REQUEST_TIMEOUT_MS = 15_000;

// A FormData body goes as it is, and the browser sets the multipart header;
// anything else is JSON.
function requestBody(body: unknown): Pick<RequestInit, "body" | "headers"> {
  if (body === undefined) return {};
  if (body instanceof FormData) return { body };
  return {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function callApi<T>(
  path: string,
  schema: z.ZodType<T>,
  init: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
    // The Letter waits for an AI answer, which is far slower than the rest.
    timeoutMs?: number;
  } = {},
): Promise<ApiResult<T>> {
  let body: unknown;
  try {
    const response = await fetch(path, {
      signal: AbortSignal.timeout(init.timeoutMs ?? REQUEST_TIMEOUT_MS),
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      ...requestBody(init.body),
    });
    // Every authenticated response says when the session ends.
    noteSessionHeaders(response.headers);
    body = await response.json();
  } catch {
    return fail("NETWORK_ERROR", true);
  }

  const success = z
    .object({ ok: z.literal(true), data: schema })
    .safeParse(body);
  if (success.success) return { ok: true, data: success.data.data };
  const failure = failureSchema.safeParse(body);
  if (failure.success) {
    // Any request can find the session gone (AD-16, FR-18): the client keeps
    // what the Student typed and goes to «Logg inn». The failure is returned
    // too, for a caller that has to free a busy button while the page leaves.
    if (failure.data.error.code === "SESSION_EXPIRED") endSession();
    return { ok: false, error: failure.data.error };
  }
  return fail("UNEXPECTED", false);
}

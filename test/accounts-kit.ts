import { expect } from "vitest";

// Shared by the accounts-on route tests of Story 6.6: register and log in
// through the real routes (PGlite), then call a route with the session cookie.
// Not a test file itself.

export const ACCOUNTS_ENV = {
  DATABASE_URL: "pglite://memory",
  ENCRYPTION_KEY: "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=",
  FEATURE_ACCOUNTS: "true",
};

type Handler = (request: Request) => Promise<Response>;

export function jsonRequest(
  path: string,
  options: { body?: unknown; cookie?: string; raw?: string } = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: options.cookie ? { cookie: `ja_sid=${options.cookie}` } : {},
    body:
      options.raw ??
      (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
}

export async function signUp(
  register: Handler,
  login: Handler,
  name: string,
  email: string,
): Promise<{ studentId: string; token: string }> {
  const registered = await register(
    jsonRequest("/api/auth/register", {
      body: { name, email, password: "12345678" },
    }),
  );
  expect(registered.status).toBe(200);
  const studentId = (
    (await registered.json()) as { data: { studentId: string } }
  ).data.studentId;
  const signed = await login(
    jsonRequest("/api/auth/login", { body: { email, password: "12345678" } }),
  );
  expect(signed.status).toBe(200);
  const cookie = signed.headers.getSetCookie()[0] ?? "";
  return {
    studentId,
    token: cookie.split(";")[0]?.slice("ja_sid=".length) ?? "",
  };
}

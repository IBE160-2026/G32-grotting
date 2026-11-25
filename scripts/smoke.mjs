import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Smoke run for CI (AD-17): the started app answers its health check and the
// seeded test user can log in (Story 6.12), read the saved Example CV back from
// Profil and has a session. Run inside the app container:
// `node scripts/smoke.mjs`. It needs no secret: setup made the key and seeded
// the user when the container started.
const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

// The local test user that setup seeds when accounts are on (FR-29, Story 6.11).
// Made-up values for the local run only, the same as in the README and in
// `src/modules/identity/server/seed.ts`: a test checks that the three agree.
// This file runs on its own in the container, so it cannot import the seed.
export const SEED_EMAIL = "testbruker@jobassistant.local";
export const SEED_PASSWORD = "testpassord-2026";

// The CV the seed puts in the test user's Profile: the Example pair's, with the
// line endings of the CV field (LF). Undefined when the file cannot be read.
function seededCv() {
  try {
    return readFileSync(
      new URL(
        "../data/fixtures/example-nordic-digital/cv.txt",
        import.meta.url,
      ),
      "utf8",
    ).replace(/\r\n?/g, "\n");
  } catch {
    return undefined;
  }
}

// Resolves to { ok: true } or { ok: false, reason }; never throws.
export async function checkHealth(baseUrl = DEFAULT_BASE_URL) {
  let response;
  try {
    response = await fetch(new URL("/api/health", baseUrl), {
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    return { ok: false, reason: `request failed: ${String(cause)}` };
  }
  if (response.status !== 200) {
    return { ok: false, reason: `expected status 200, got ${response.status}` };
  }
  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "response is not JSON" };
  }
  if (body?.ok !== true || body?.data?.hosted !== false) {
    return {
      ok: false,
      reason: `expected {"ok":true,"data":{"hosted":false}}, got ${JSON.stringify(body)}`,
    };
  }
  return { ok: true };
}

// Logs in as the seeded test user, as the browser does, then reads the session
// and the Profile with the cookie. Resolves to { ok: true } or
// { ok: false, reason }; never throws. The reason never holds the password, the
// cookie or a response body.
export async function checkLogin(baseUrl = DEFAULT_BASE_URL) {
  const call = async (path, init) => {
    try {
      return {
        response: await fetch(new URL(path, baseUrl), {
          ...init,
          signal: AbortSignal.timeout(20_000),
        }),
      };
    } catch (error) {
      const cause = error instanceof Error && error.cause ? error.cause : error;
      return { reason: `${path}: request failed: ${String(cause)}` };
    }
  };
  const json = async (response) => {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  };

  const login = await call("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
  });
  if (login.response === undefined) return { ok: false, reason: login.reason };
  if (login.response.status !== 200) {
    return {
      ok: false,
      reason: `login as the test user: expected status 200, got ${login.response.status}`,
    };
  }
  const body = await json(login.response);
  if (body?.ok !== true || body?.data?.email !== SEED_EMAIL) {
    return { ok: false, reason: "login as the test user: unexpected answer" };
  }
  const cookie = login.response.headers
    .getSetCookie()
    .map((line) => line.split(";")[0] ?? "")
    .find(
      (pair) => pair.startsWith("ja_sid=") && pair.length > "ja_sid=".length,
    );
  if (cookie === undefined) {
    return { ok: false, reason: "login as the test user: no session cookie" };
  }

  const session = await call("/api/session", { headers: { cookie } });
  if (session.response === undefined) {
    return { ok: false, reason: session.reason };
  }
  const sessionBody = await json(session.response);
  if (
    session.response.status !== 200 ||
    sessionBody?.data?.email !== SEED_EMAIL
  ) {
    return {
      ok: false,
      reason: `/api/session with the new cookie: expected the test user, got status ${session.response.status}`,
    };
  }

  const profile = await call("/api/profile", { headers: { cookie } });
  if (profile.response === undefined) {
    return { ok: false, reason: profile.reason };
  }
  const profileBody = await json(profile.response);
  const expectedCv = seededCv();
  if (
    profile.response.status !== 200 ||
    typeof profileBody?.data?.cvText !== "string" ||
    profileBody.data.cvText.length < 200 ||
    (expectedCv !== undefined && profileBody.data.cvText !== expectedCv)
  ) {
    return {
      ok: false,
      reason: `/api/profile: expected the seeded CV, got status ${profile.response.status}`,
    };
  }
  return { ok: true };
}

function isEntryPoint() {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  const baseUrl = process.argv[2] ?? DEFAULT_BASE_URL;
  const health = await checkHealth(baseUrl);
  if (!health.ok) {
    process.stderr.write(`Smoke failed: ${health.reason}\n`);
    process.exit(1);
  }
  const login = await checkLogin(baseUrl);
  if (!login.ok) {
    process.stderr.write(`Smoke failed: ${login.reason}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `Smoke passed: ${baseUrl}/api/health, login as the test user, Profil\n`,
  );
}

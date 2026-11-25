import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

// Story 6.11: under E2E=1 `db.ts` seeds the in-memory PGlite when it opens, so
// the end-to-end tests can log in. Each test starts from fresh modules (config
// is memoised) and a closed database.

const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const EMAIL = "testbruker@jobassistant.local";
const PASSWORD = "testpassord-2026";

function stubRun(env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [name, value] of Object.entries({
    DATABASE_URL: "pglite://memory",
    ENCRYPTION_KEY: KEY,
    ...env,
  })) {
    vi.stubEnv(name, value);
  }
}

// Starts the server the way Next does, then reads what the database holds.
async function startAndCount(): Promise<number> {
  const { startE2eSeed } = await import("./instrumentation-node");
  await startE2eSeed();
  const { getDb } = await import("@/shared/server/db");
  const db = await getDb();
  const result = await db.execute(sql`select email from students`);
  return (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows)
    .length;
}

afterEach(async () => {
  const { closeDb, registerE2eSeed } = await import("@/shared/server/db");
  registerE2eSeed(undefined);
  await closeDb();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("FR-29 the seed under E2E=1 (db.ts, AD-9)", () => {
  it("seeds the test user when the server starts, so a login works", async () => {
    stubRun({ E2E: "1", FEATURE_ACCOUNTS: "true" });
    expect(await startAndCount()).toBe(1);

    const { getDb } = await import("@/shared/server/db");
    const { loginAccount } = await import("@/modules/identity");
    const { view } = await loginAccount(
      await getDb(),
      { email: EMAIL, password: PASSWORD },
      new Date("2026-11-25T10:00:00.000Z"),
    );
    expect(view.email).toBe(EMAIL);
  });

  it("seeds nothing with accounts off", async () => {
    stubRun({ E2E: "1", FEATURE_ACCOUNTS: "false" });
    expect(await startAndCount()).toBe(0);
  });

  it("seeds nothing outside Playwright", async () => {
    stubRun({ E2E: "", FEATURE_ACCOUNTS: "true" });
    expect(await startAndCount()).toBe(0);
  });

  it("seeds nothing on Hosted, even with E2E=1", async () => {
    stubRun({
      E2E: "1",
      FEATURE_ACCOUNTS: "true",
      APP_ENV: "hosted",
      ACCESS_CODE: "0123456789abcdef",
    });
    expect(await startAndCount()).toBe(0);
  });
});

import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cvTextSchema } from "@/modules/cv/contracts";
import { getProfile, saveCvText, saveNoticeVersion } from "@/modules/profile";
import { parseConfig } from "@/shared/server/config";
import { loadExamplePair } from "@/shared/server/data-files";
import { closeDb, getDb } from "@/shared/server/db";
import { loginAccount } from "./login";
import { registerAccount } from "./register";
import { mayRunSeed, SEED_TEST_USER, seedTestUser } from "./seed";

afterAll(closeDb);

const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const ON = { FEATURE_ACCOUNTS: "true", ENCRYPTION_KEY: KEY };

// A local Postgres host. The rows are written to the test's PGlite either way:
// the config says which database the run believes it has.
const localPostgres = (host = "db", extra: Record<string, string> = {}) =>
  parseConfig({
    APP_ENV: "local",
    DATABASE_URL: `postgres://u:p@${host}:5432/x`,
    ...ON,
    ...extra,
  });
const playwrightRun = () =>
  parseConfig({
    APP_ENV: "local",
    DATABASE_URL: "pglite://memory",
    E2E: "1",
    ...ON,
  });

function rowsOf(result: unknown): Record<string, unknown>[] {
  return (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as Record<string, unknown>[];
}

async function raw<T = Record<string, unknown>>(
  query: ReturnType<typeof sql>,
): Promise<T[]> {
  return rowsOf(await (await getDb()).execute(query)) as T[];
}

// The Example CV as the CV field gives it: LF line endings.
async function exampleCv(): Promise<string> {
  return (await loadExamplePair()).cvText.replaceAll("\r\n", "\n");
}

beforeEach(async () => {
  // Sessions and profiles go with the students (ON DELETE CASCADE).
  await (await getDb()).execute(sql`delete from students`);
});

describe("FR-29 and AD-12: where the test user may be seeded", () => {
  it("allows accounts on, APP_ENV=local and a local database host", () => {
    for (const host of ["db", "127.0.0.1", "localhost"]) {
      expect(mayRunSeed(localPostgres(host))).toBe(true);
    }
  });

  it("allows the PGlite of a Playwright run", () => {
    expect(mayRunSeed(playwrightRun())).toBe(true);
  });

  it("refuses with accounts off", () => {
    // Accounts are on by default since Story 6.12, so the flag is set off.
    const off = parseConfig({
      APP_ENV: "local",
      DATABASE_URL: "postgres://u:p@db:5432/x",
      ENCRYPTION_KEY: KEY,
      FEATURE_ACCOUNTS: "false",
    });
    expect(off.features.accounts).toBe(false);
    expect(mayRunSeed(off)).toBe(false);
    expect(mayRunSeed(localPostgres("db", { FEATURE_ACCOUNTS: "false" }))).toBe(
      false,
    );
  });

  it("refuses the Hosted version, also on a local host and in a test run", () => {
    const hosted = { APP_ENV: "hosted", ACCESS_CODE: "0123456789abcdef" };
    expect(mayRunSeed(localPostgres("db", hosted))).toBe(false);
    expect(mayRunSeed(localPostgres("localhost", hosted))).toBe(false);
    expect(
      mayRunSeed(
        parseConfig({
          ...hosted,
          DATABASE_URL: "pglite://memory",
          E2E: "1",
          ...ON,
        }),
      ),
    ).toBe(false);
  });

  it("refuses a database that is not local", () => {
    expect(mayRunSeed(localPostgres("x.supabase.co"))).toBe(false);
    expect(mayRunSeed(localPostgres("db.example.com"))).toBe(false);
    expect(mayRunSeed(localPostgres("10.0.0.5"))).toBe(false);
  });

  it("refuses PGlite outside a test run", () => {
    expect(
      mayRunSeed(
        parseConfig({
          APP_ENV: "local",
          DATABASE_URL: "pglite://memory",
          ...ON,
        }),
      ),
    ).toBe(false);
  });

  it("refuses without the key, since the CV is stored encrypted", () => {
    expect(
      mayRunSeed(
        parseConfig({
          APP_ENV: "local",
          DATABASE_URL: "postgres://u:p@db:5432/x",
          FEATURE_ACCOUNTS: "true",
        }),
      ),
    ).toBe(false);
  });
});

describe("FR-29 seedTestUser", () => {
  it("creates the user and the Profile with the Example pair CV", async () => {
    const db = await getDb();
    expect(await seedTestUser(db, localPostgres())).toBe(true);

    const students = await raw(sql`select email from students`);
    expect(students).toEqual([{ email: SEED_TEST_USER.email }]);
    const [{ id }] = await raw<{ id: string }>(sql`select id from students`);
    const profile = await getProfile(id as string, db);
    const cvText = await exampleCv();
    expect(profile?.name).toBe(SEED_TEST_USER.name);
    expect(profile?.cvText).toBe(cvText);
    expect(profile?.cvSavedAt).not.toBeNull();
    expect(cvTextSchema.safeParse(cvText).success).toBe(true);
  });

  it("creates nothing with the flag off, on Hosted or on a foreign database", async () => {
    const db = await getDb();
    const refused = [
      parseConfig({
        APP_ENV: "local",
        DATABASE_URL: "postgres://u:p@db:5432/x",
        ENCRYPTION_KEY: KEY,
        // On by default since Story 6.12, so the flag is set off.
        FEATURE_ACCOUNTS: "false",
      }),
      localPostgres("db", {
        APP_ENV: "hosted",
        ACCESS_CODE: "0123456789abcdef",
      }),
      localPostgres("x.supabase.co"),
    ];
    for (const config of refused) {
      expect(await seedTestUser(db, config)).toBe(false);
    }
    expect(await raw(sql`select id from students`)).toHaveLength(0);
    expect(await raw(sql`select student_id from profiles`)).toHaveLength(0);
  });

  it("run twice leaves one user and one Profile, with the CV put back", async () => {
    const db = await getDb();
    const config = localPostgres();
    await seedTestUser(db, config);
    const [{ id, password_hash: first }] = await raw<{
      id: string;
      password_hash: string;
    }>(sql`select id, password_hash from students`);
    await saveCvText(
      id as string,
      db,
      "Min egen CV som ikke er Example-paret.",
    );
    await saveNoticeVersion(id as string, db, "notice-3:test");
    const nameBefore = (
      await raw<{ name: string }>(sql`select name from profiles`)
    )[0]?.name;
    expect((await getProfile(id as string, db))?.cvText).toBe(
      "Min egen CV som ikke er Example-paret.",
    );

    expect(await seedTestUser(db, config)).toBe(true);

    // Only the CV and its save date are put back: the name (a new ciphertext
    // each time it is written) and the accepted notice stay as they were.
    expect(
      (await raw<{ name: string }>(sql`select name from profiles`))[0]?.name,
    ).toBe(nameBefore);
    expect((await getProfile(id as string, db))?.aiNoticeVersion).toBe(
      "notice-3:test",
    );
    expect(await raw(sql`select id from students`)).toHaveLength(1);
    expect(await raw(sql`select student_id from profiles`)).toHaveLength(1);
    const cvText = await exampleCv();
    expect((await getProfile(id as string, db))?.cvText).toBe(cvText);
    const [{ password_hash: second }] = await raw<{ password_hash: string }>(
      sql`select password_hash from students`,
    );
    expect(second).toBe(first);
  });

  it("stores the CV and the name encrypted, and the password only as a hash", async () => {
    const db = await getDb();
    await seedTestUser(db, localPostgres());
    const cvText = await exampleCv();
    const [row] = await raw<{
      name: string;
      cv_text: string;
      password_hash: string;
    }>(
      sql`select p.name, p.cv_text, s.password_hash from profiles p join students s on s.id = p.student_id`,
    );
    expect(row?.cv_text.startsWith("v1.")).toBe(true);
    expect(row?.name.startsWith("v1.")).toBe(true);
    const stored = JSON.stringify(row);
    expect(stored).not.toContain("Violet");
    expect(stored).not.toContain("Hansen");
    for (const line of cvText.split("\n").filter((l) => l.trim().length > 12)) {
      expect(stored).not.toContain(line.trim());
    }
    expect(row?.password_hash.startsWith("scrypt$")).toBe(true);
    expect(row?.password_hash).not.toContain(SEED_TEST_USER.password);
  });

  it("lets the seed user log in with the password the README names", async () => {
    const db = await getDb();
    await seedTestUser(db, localPostgres());
    const { view } = await loginAccount(
      db,
      { email: SEED_TEST_USER.email, password: SEED_TEST_USER.password },
      new Date("2026-11-25T10:00:00.000Z"),
    );
    expect(view.email).toBe(SEED_TEST_USER.email);
    expect(view.name).toBe(SEED_TEST_USER.name);
  });

  it("leaves an account that holds the seed email but not the seed password alone", async () => {
    const db = await getDb();
    const { studentId } = await registerAccount(
      db,
      {
        name: "Annen Person",
        email: SEED_TEST_USER.email,
        password: "et-helt-annet-passord",
      },
      { hosted: false, accessCode: undefined },
    );
    expect(await seedTestUser(db, localPostgres())).toBe(false);
    const profile = await getProfile(studentId, db);
    expect(profile?.name).toBe("Annen Person");
    expect(profile?.cvText).toBeNull();
    expect(await raw(sql`select id from students`)).toHaveLength(1);
  });
});

import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import { checkKeyStep, LOCAL_STEPS, runSetup, seedStep } from "./setup";

afterAll(closeDb);

// FR-29, AD-12 and AD-17: setup seeds the test user as a local step, after the
// key check, and only on a local database with accounts on. The configs say
// which database the run believes it has; the rows go to the test's PGlite.

const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const config = (url: string, extra: Record<string, string> = {}) =>
  parseConfig({
    APP_ENV: "local",
    DATABASE_URL: url,
    ENCRYPTION_KEY: KEY,
    FEATURE_ACCOUNTS: "true",
    ...extra,
  });

async function countRows(table: "students" | "profiles") {
  const db = await getDb();
  const result = await db.execute(
    table === "students"
      ? sql`select id from students`
      : sql`select student_id from profiles`,
  );
  return (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows)
    .length;
}

beforeEach(async () => {
  const db = await getDb();
  await db.execute(sql`delete from students`);
  await db.execute(sql`delete from local_meta`);
});

describe("FR-29 setup seeds the test user (AD-12, AD-17)", () => {
  it("runs the seed after the key check", () => {
    expect(LOCAL_STEPS).toEqual([checkKeyStep, seedStep]);
  });

  it("creates the user and the Profile on a local database with accounts on", async () => {
    await runSetup(await getDb(), config("postgres://u:p@db:5432/x"));
    expect(await countRows("students")).toBe(1);
    expect(await countRows("profiles")).toBe(1);
  });

  it("run twice keeps one user and one Profile", async () => {
    const db = await getDb();
    await runSetup(db, config("postgres://u:p@127.0.0.1:5432/x"));
    await runSetup(db, config("postgres://u:p@127.0.0.1:5432/x"));
    expect(await countRows("students")).toBe(1);
    expect(await countRows("profiles")).toBe(1);
  });

  it("creates no user against a database that is not local", async () => {
    await runSetup(
      await getDb(),
      config("postgres://u:p@aws-0.pooler.supabase.com:5432/x"),
    );
    expect(await countRows("students")).toBe(0);
  });

  it("creates no user on Hosted, also on a local host", async () => {
    await runSetup(
      await getDb(),
      config("postgres://u:p@db:5432/x", {
        APP_ENV: "hosted",
        ACCESS_CODE: "0123456789abcdef",
      }),
    );
    expect(await countRows("students")).toBe(0);
  });

  it("creates no user with accounts off, which is the default", async () => {
    await runSetup(
      await getDb(),
      config("postgres://u:p@db:5432/x", { FEATURE_ACCOUNTS: "false" }),
    );
    expect(await countRows("students")).toBe(0);
  });
});

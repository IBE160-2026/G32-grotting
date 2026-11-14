import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { applyMigrations, closeDb, getDb, withAdvisoryLock } from "./db";

afterAll(closeDb);

describe("NFR-9 database in tests (AD-9)", () => {
  it("opens PGlite in memory and answers SELECT 1", async () => {
    const db = await getDb();
    const result = await db.execute(sql`select 1 as one`);
    expect(JSON.stringify(result)).toContain('"one":1');
  });

  it("keeps one instance per process", async () => {
    expect(await getDb()).toBe(await getDb());
  });

  it("skips migrating while there is no migration history", async () => {
    await expect(applyMigrations(await getDb())).resolves.toBeUndefined();
  });

  it("opens a fresh instance after closeDb", async () => {
    const first = await getDb();
    await closeDb();
    expect(await getDb()).not.toBe(first);
  });
});

describe("NFR-9 advisory lock (AD-17)", () => {
  it("runs the function and returns its value on PGlite", async () => {
    const db = await getDb();
    await expect(withAdvisoryLock(db, 1, async () => 42)).resolves.toBe(42);
  });

  it("passes a failure on", async () => {
    const db = await getDb();
    await expect(
      withAdvisoryLock(db, 1, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});

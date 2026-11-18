import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("applies every committed migration and creates its tables", async () => {
    const db = await getDb();
    const journal = JSON.parse(
      readFileSync(
        join(process.cwd(), "drizzle", "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: unknown[] };
    const rowsOf = async (query: ReturnType<typeof sql>) => {
      const result = await db.execute(query);
      return (
        Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
      ) as Record<string, unknown>[];
    };
    // Opening already applied the history; applying it again changes nothing.
    await expect(applyMigrations(db)).resolves.toBeUndefined();
    const applied = await rowsOf(
      sql`select id from drizzle.__drizzle_migrations`,
    );
    expect(journal.entries.length).toBeGreaterThan(0);
    expect(applied).toHaveLength(journal.entries.length);
    const tables = await rowsOf(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    expect(tables.length).toBeGreaterThan(0);
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

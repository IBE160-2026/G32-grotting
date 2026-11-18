import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/shared/server/db";
import { DAILY_CAP, reserveRequest } from "./daily-cap";

afterAll(closeDb);

beforeEach(async () => {
  await (await getDb()).execute(sql`delete from ai_usage`);
});

async function count(scope: string, day: string) {
  const result = await (await getDb()).execute(
    sql`select count from ai_usage where scope = ${scope} and day = ${day}`,
  );
  const rows = (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as {
    count: number;
  }[];
  return rows[0]?.count;
}

describe("FR-25 ai_usage migration", () => {
  it("is applied with the scope, day and count columns", async () => {
    const result = await (await getDb()).execute(
      sql`select column_name from information_schema.columns where table_name = 'ai_usage' order by column_name`,
    );
    const rows = (
      Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
    ) as { column_name: string }[];
    expect(rows.map((row) => row.column_name)).toEqual([
      "count",
      "day",
      "scope",
    ]);
  });
});

describe("FR-25 reserveRequest", () => {
  it("names the limit once", () => {
    expect(DAILY_CAP).toBe(30);
  });

  it("creates the row on the first request and counts up", async () => {
    const db = await getDb();
    expect(await reserveRequest(db, "installation", "2026-11-18")).toBe(true);
    expect(await reserveRequest(db, "installation", "2026-11-18")).toBe(true);
    expect(await count("installation", "2026-11-18")).toBe(2);
  });

  it("refuses at the limit and leaves the count at the limit", async () => {
    const db = await getDb();
    for (let i = 0; i < DAILY_CAP; i++) {
      expect(await reserveRequest(db, "s", "2026-11-18")).toBe(true);
    }
    expect(await reserveRequest(db, "s", "2026-11-18")).toBe(false);
    expect(await reserveRequest(db, "s", "2026-11-18")).toBe(false);
    expect(await count("s", "2026-11-18")).toBe(DAILY_CAP);
  });

  it("keeps each scope and each day apart", async () => {
    const db = await getDb();
    for (let i = 0; i < DAILY_CAP; i++) {
      await reserveRequest(db, "a", "2026-11-18");
    }
    expect(await reserveRequest(db, "b", "2026-11-18")).toBe(true);
    expect(await reserveRequest(db, "a", "2026-11-19")).toBe(true);
    expect(await count("a", "2026-11-19")).toBe(1);
  });
});

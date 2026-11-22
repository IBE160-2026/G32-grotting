import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/shared/server/db";
import { createProfile, getProfileSummary } from "./profiles";

afterAll(closeDb);

function rowsOf(result: unknown): Record<string, unknown>[] {
  return (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as Record<string, unknown>[];
}

// `students` belongs to identity: this slice's tests make one with plain SQL.
let counter = 0;
async function newStudent(): Promise<string> {
  const db = await getDb();
  const result = await db.execute(
    sql`insert into students (email, password_hash) values (${`p${++counter}@example.test`}, 'x') returning id`,
  );
  return String(rowsOf(result)[0]?.id);
}

describe("AD-10 and AD-11 profiles", () => {
  it("stores the name encrypted and reads it back for its Student", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Kari Nordmann");

    expect(await getProfileSummary(studentId, db)).toEqual({
      name: "Kari Nordmann",
      noticeVersion: null,
    });
    const raw = await db.execute(sql`select name from profiles`);
    const text = JSON.stringify(raw);
    expect(text).toContain("v1.");
    expect(text).not.toContain("Kari");
    expect(text).not.toContain("Nordmann");
  });

  it("gives each Student their own profile and none to another id", async () => {
    const db = await getDb();
    const a = await newStudent();
    const b = await newStudent();
    await createProfile(db, a, "Anna A");
    await createProfile(db, b, "Bjørn B");
    expect((await getProfileSummary(a, db))?.name).toBe("Anna A");
    expect((await getProfileSummary(b, db))?.name).toBe("Bjørn B");
    expect(
      await getProfileSummary("00000000-0000-4000-8000-000000000000", db),
    ).toBeNull();
  });

  it("allows one profile per Student", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Én");
    await expect(createProfile(db, studentId, "To")).rejects.toBeDefined();
  });

  it("deletes the profile with the Student", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Slettes");
    await db.execute(sql`delete from students where id = ${studentId}`);
    expect(await getProfileSummary(studentId, db)).toBeNull();
  });
});

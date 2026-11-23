import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { DecryptError } from "@/shared/server/crypto";
import { closeDb, getDb } from "@/shared/server/db";
import { createProfile } from "./profiles";
import { getProfile, saveCvText, saveNoticeVersion } from "./repository";

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
    sql`insert into students (email, password_hash) values (${`r${++counter}@example.test`}, 'x') returning id`,
  );
  return String(rowsOf(result)[0]?.id);
}

const CV_A =
  "Sertifisert regnskapsfører med erfaring fra Brønnøysund og Kongsberg. ".repeat(
    4,
  );
const CV_B = "Prosjektleder for Aker-Solutions i Stavanger. ".repeat(6);

describe("Story 6.3 profile repository", () => {
  it("has no CV text for a new Profile", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Kari Nordmann");
    expect(await getProfile(studentId, db)).toEqual({
      name: "Kari Nordmann",
      cvText: null,
      cvSavedAt: null,
      aiNoticeVersion: null,
    });
  });

  it("saves the CV text and reads it back", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Kari Nordmann");
    const saved = await saveCvText(studentId, db, CV_A);
    expect(saved).toEqual({
      name: "Kari Nordmann",
      cvText: CV_A,
      cvSavedAt: expect.any(String),
      aiNoticeVersion: null,
    });
    expect(await getProfile(studentId, db)).toEqual(saved);
  });

  it("replaces the old text on each save", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Kari Nordmann");
    await saveCvText(studentId, db, CV_A);
    await saveCvText(studentId, db, CV_B);
    expect((await getProfile(studentId, db))?.cvText).toBe(CV_B);
  });

  it("stores neither the name nor the CV text in plain text", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Ingrid Solbakken");
    await saveCvText(studentId, db, CV_A);
    const raw = await db.execute(
      sql`select name, cv_text from profiles where student_id = ${studentId}`,
    );
    const [row] = rowsOf(raw);
    expect(String(row?.cv_text)).toMatch(/^v1\./);
    expect(String(row?.name)).toMatch(/^v1\./);
    const dump = JSON.stringify(raw);
    for (const word of [
      "Ingrid",
      "Solbakken",
      "regnskapsfører",
      "Kongsberg",
      "Sertifisert",
      Buffer.from(CV_A).toString("base64").slice(0, 40),
    ]) {
      expect(dump).not.toContain(word);
    }
  });

  it("keeps two Students apart", async () => {
    const db = await getDb();
    const a = await newStudent();
    const b = await newStudent();
    await createProfile(db, a, "Anna A");
    await createProfile(db, b, "Bjørn B");
    await saveCvText(a, db, CV_A);
    await saveCvText(b, db, CV_B);
    expect((await getProfile(a, db))?.cvText).toBe(CV_A);
    expect((await getProfile(b, db))?.cvText).toBe(CV_B);
    await saveCvText(a, db, CV_B);
    expect((await getProfile(a, db))?.cvText).toBe(CV_B);
    expect((await getProfile(b, db))?.cvText).toBe(CV_B);
    expect((await getProfile(b, db))?.name).toBe("Bjørn B");
  });

  it("finds no Profile and saves nothing for an unknown id", async () => {
    const db = await getDb();
    const unknown = "00000000-0000-4000-8000-000000000000";
    expect(await getProfile(unknown, db)).toBeNull();
    expect(await saveCvText(unknown, db, CV_A)).toBeNull();
  });

  it("throws when the stored CV text cannot be decrypted", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Kari Nordmann");
    await db.execute(
      sql`update profiles set cv_text = 'v1.AAAA.BBBB.CCCC' where student_id = ${studentId}`,
    );
    await expect(getProfile(studentId, db)).rejects.toBeInstanceOf(
      DecryptError,
    );
  });
});

describe("Story 6.6 profile repository", () => {
  it("sets the save date on each save, as an ISO instant", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Kari Nordmann");
    const before = Date.now();
    const first = await saveCvText(studentId, db, CV_A);
    const firstAt = new Date(first?.cvSavedAt ?? "").getTime();
    expect(first?.cvSavedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(firstAt).toBeGreaterThanOrEqual(before - 1000);
    expect(firstAt).toBeLessThanOrEqual(Date.now() + 1000);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await saveCvText(studentId, db, CV_B);
    expect(new Date(second?.cvSavedAt ?? "").getTime()).toBeGreaterThan(
      firstAt,
    );
  });

  it("stores the notice version on that Student's Profile only", async () => {
    const db = await getDb();
    const a = await newStudent();
    const b = await newStudent();
    await createProfile(db, a, "Anna A");
    await createProfile(db, b, "Bjørn B");
    expect(await saveNoticeVersion(a, db, "notice-3:x")).toBe("notice-3:x");
    expect((await getProfile(a, db))?.aiNoticeVersion).toBe("notice-3:x");
    expect((await getProfile(b, db))?.aiNoticeVersion).toBeNull();
  });

  it("keeps the CV text and its date when the notice is accepted", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    await createProfile(db, studentId, "Kari Nordmann");
    const saved = await saveCvText(studentId, db, CV_A);
    await saveNoticeVersion(studentId, db, "notice-3:x");
    const after = await getProfile(studentId, db);
    expect(after?.cvText).toBe(CV_A);
    expect(after?.cvSavedAt).toBe(saved?.cvSavedAt);
  });

  it("stores nothing and answers null for an unknown id", async () => {
    const db = await getDb();
    expect(
      await saveNoticeVersion("00000000-0000-4000-8000-000000000000", db, "v"),
    ).toBeNull();
  });
});

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/shared/server/db";
import type { Executor } from "./executor";
import { sessions, students } from "./schema";
import {
  createSession,
  deleteSessionByToken,
  hashToken,
  lookupSession,
  renewSession,
  SESSION_EXTEND_AFTER_MS,
  SESSION_TTL_MS,
} from "./sessions";

afterAll(closeDb);

const MINUTE = 60_000;
const T0 = new Date("2026-11-22T10:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * MINUTE);

let counter = 0;
async function newStudent(): Promise<string> {
  const db: Executor = await getDb();
  const [row] = await db
    .insert(students)
    .values({ email: `s${++counter}@example.test`, passwordHash: "x" })
    .returning({ id: students.id });
  return row?.id ?? "";
}

async function rowOf(token: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)));
  return row;
}

beforeEach(async () => {
  await (await getDb()).delete(sessions);
});

describe("AD-12 sessions", () => {
  it("names the two times once", () => {
    expect(SESSION_TTL_MS).toBe(30 * MINUTE);
    expect(SESSION_EXTEND_AFTER_MS).toBe(5 * MINUTE);
  });

  it("creates an opaque 32-byte token and stores only its SHA-256", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const { token, expiresAt } = await createSession(studentId, T0, db);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(expiresAt).toEqual(at(30));

    const all = await db.select().from(sessions);
    expect(all).toHaveLength(1);
    expect(all[0]?.tokenHash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(JSON.stringify(all)).not.toContain(token);
    expect(all[0]?.studentId).toBe(studentId);
  });

  it("gives every session its own token", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const a = await createSession(studentId, T0, db);
    const b = await createSession(studentId, T0, db);
    expect(a.token).not.toBe(b.token);
  });

  it("finds the session without extending it before 5 minutes", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const { token } = await createSession(studentId, T0, db);
    const found = await lookupSession(db, token, at(4.9));
    expect(found?.studentId).toBe(studentId);
    expect(found?.expiresAt).toEqual(at(30));
    expect((await rowOf(token))?.lastActiveAt).toEqual(T0);
  });

  it("extends it once the last extension is 5 minutes old", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const { token } = await createSession(studentId, T0, db);
    const found = await lookupSession(db, token, at(5));
    expect(found?.expiresAt).toEqual(at(35));
    expect((await rowOf(token))?.lastActiveAt).toEqual(at(5));
    // The next request is measured from the new extension.
    const next = await lookupSession(db, token, at(9));
    expect(next?.expiresAt).toEqual(at(35));
    expect((await rowOf(token))?.lastActiveAt).toEqual(at(5));
  });

  it("is still valid a moment before 30 minutes and gone at 30", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const { token } = await createSession(studentId, T0, db);
    expect(
      await lookupSession(db, token, new Date(at(30).getTime() - 1)),
    ).not.toBeNull();

    const other = await createSession(studentId, T0, db);
    expect(await lookupSession(db, other.token, at(30))).toBeNull();
    expect(await rowOf(other.token)).toBeUndefined();
  });

  it("returns null for an unknown, empty or oversized token", async () => {
    const db = await getDb();
    await newStudent();
    expect(await lookupSession(db, "nope", T0)).toBeNull();
    expect(await lookupSession(db, "", T0)).toBeNull();
    expect(await lookupSession(db, "a".repeat(10_000), T0)).toBeNull();
  });

  it("does not take the stored hash as a token", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const { token } = await createSession(studentId, T0, db);
    expect(await lookupSession(db, hashToken(token), T0)).toBeNull();
  });

  it("renew always extends and moves the end", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const { token } = await createSession(studentId, T0, db);
    const found = await lookupSession(db, token, at(1));
    const expiresAt = await renewSession(
      studentId,
      found?.sessionId ?? "",
      at(1),
      db,
    );
    expect(expiresAt).toEqual(at(31));
    expect((await rowOf(token))?.lastActiveAt).toEqual(at(1));
  });

  it("renew does not reach another Student's session", async () => {
    const db = await getDb();
    const a = await newStudent();
    const b = await newStudent();
    const { token } = await createSession(a, T0, db);
    const found = await lookupSession(db, token, at(1));
    expect(
      await renewSession(b, found?.sessionId ?? "", at(20), db),
    ).toBeNull();
    expect((await rowOf(token))?.lastActiveAt).toEqual(T0);
    expect(
      await renewSession(a, "00000000-0000-4000-8000-000000000000", at(20), db),
    ).toBeNull();
  });

  it("deletes a session by its token, and nothing for any other value", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const keep = await createSession(studentId, T0, db);
    const drop = await createSession(studentId, T0, db);
    await deleteSessionByToken(db, "garbage");
    await deleteSessionByToken(db, "");
    await deleteSessionByToken(db, drop.token);
    expect(await rowOf(drop.token)).toBeUndefined();
    expect(await rowOf(keep.token)).toBeDefined();
  });

  it("creating a session removes that Student's expired rows only", async () => {
    const db = await getDb();
    const a = await newStudent();
    const b = await newStudent();
    const oldA = await createSession(a, T0, db);
    const oldB = await createSession(b, T0, db);
    const freshA = await createSession(a, at(20), db);
    // 40 minutes on: A's first row is expired, A's second (20 minutes old) is not.
    await createSession(a, at(40), db);
    expect(await rowOf(oldA.token)).toBeUndefined();
    expect(await rowOf(freshA.token)).toBeDefined();
    expect(await rowOf(oldB.token)).toBeDefined();
  });

  it("deleting a Student deletes their sessions", async () => {
    const db = await getDb();
    const studentId = await newStudent();
    const { token } = await createSession(studentId, T0, db);
    await db.delete(students).where(eq(students.id, studentId));
    expect(await rowOf(token)).toBeUndefined();
  });
});

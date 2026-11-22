import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/shared/server/db";
import {
  createStudent,
  EmailTakenError,
  findStudentByEmail,
  getStudentEmail,
} from "./students";

afterAll(closeDb);

describe("AD-10 students", () => {
  it("creates a Student and finds it by email and by id", async () => {
    const db = await getDb();
    const { studentId } = await createStudent(db, {
      email: "kari@example.test",
      passwordHash: "scrypt$hash",
    });
    expect(await findStudentByEmail(db, "kari@example.test")).toEqual({
      studentId,
      passwordHash: "scrypt$hash",
    });
    expect(await getStudentEmail(studentId, db)).toBe("kari@example.test");
  });

  it("answers null for an unknown email or id", async () => {
    const db = await getDb();
    expect(await findStudentByEmail(db, "nobody@example.test")).toBeNull();
    expect(
      await getStudentEmail("00000000-0000-4000-8000-000000000000", db),
    ).toBeNull();
  });

  it("reports a taken email as EmailTakenError", async () => {
    const db = await getDb();
    const input = { email: "twice@example.test", passwordHash: "x" };
    await createStudent(db, input);
    await expect(createStudent(db, input)).rejects.toBeInstanceOf(
      EmailTakenError,
    );
  });

  it("reports a taken email inside a transaction the same way", async () => {
    const db = await getDb();
    await createStudent(db, { email: "tx@example.test", passwordHash: "x" });
    await expect(
      db.transaction((tx) =>
        createStudent(tx, { email: "tx@example.test", passwordHash: "y" }),
      ),
    ).rejects.toBeInstanceOf(EmailTakenError);
  });
});

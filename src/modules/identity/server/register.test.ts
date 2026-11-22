import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { initCrypto } from "@/shared/server/crypto";
import { closeDb, getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";
import { registerAccount } from "./register";
import { students } from "./schema";

// The vitest env key (vitest.config.ts).
const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const CODE = "a-long-random-code-1234";
const local = { hosted: false, accessCode: undefined } as const;
const hosted = { hosted: true, accessCode: CODE } as const;

afterAll(closeDb);

beforeEach(async () => {
  const db = await getDb();
  await db.delete(students);
});

function rowsOf(result: unknown): Record<string, unknown>[] {
  return (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as Record<string, unknown>[];
}

async function counts() {
  const db = await getDb();
  return { students: (await db.select().from(students)).length };
}

async function profileCount() {
  const db = await getDb();
  const result = await db.execute(sql`select count(*)::int as n from profiles`);
  return rowsOf(result)[0]?.n;
}

const valid = {
  name: "  Kari Nordmann ",
  email: "  Kari.Nordmann@Example.TEST ",
  password: "correct horse",
};

describe("FR-18 registerAccount", () => {
  it("stores a lower-cased email, a scrypt hash and an encrypted name", async () => {
    const db = await getDb();
    const result = await registerAccount(db, valid, local);
    expect(result.studentId).toMatch(/^[0-9a-f-]{36}$/);

    const rows = await db.select().from(students);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(result.studentId);
    expect(rows[0]?.email).toBe("kari.nordmann@example.test");
    const parts = rows[0]?.passwordHash.split("$") ?? [];
    expect(parts.slice(0, 4)).toEqual(["scrypt", "16384", "8", "1"]);
    expect(Buffer.from(parts[4] ?? "", "base64url")).toHaveLength(16);
    expect(rows[0]?.passwordHash).not.toContain("correct horse");

    const raw = JSON.stringify(await db.execute(sql`select * from profiles`));
    expect(raw).toContain(result.studentId);
    expect(raw).toContain("v1.");
    expect(raw).not.toContain("Kari");
    expect(await profileCount()).toBe(1);
  });

  it("refuses a password under 8 characters and writes nothing", async () => {
    const db = await getDb();
    const error = await registerAccount(
      db,
      { ...valid, password: "1234567" },
      local,
    ).catch((e) => e);
    expect(error).toBeInstanceOf(ZodError);
    expect((error as ZodError).issues[0]?.path).toEqual(["password"]);
    expect((await counts()).students).toBe(0);
    expect(await profileCount()).toBe(0);
  });

  it("accepts a password of exactly 8 characters", async () => {
    const db = await getDb();
    await registerAccount(db, { ...valid, password: "12345678" }, local);
    expect((await counts()).students).toBe(1);
  });

  it("refuses an empty name, a long name and a bad email on their field", async () => {
    const db = await getDb();
    const field = async (patch: Record<string, string>) => {
      const error = await registerAccount(
        db,
        { ...valid, ...patch },
        local,
      ).catch((e) => e);
      expect(error).toBeInstanceOf(ZodError);
      return (error as ZodError).issues[0]?.path[0];
    };
    expect(await field({ name: "   " })).toBe("name");
    expect(await field({ name: "x".repeat(201) })).toBe("name");
    expect(await field({ email: "not an email" })).toBe("email");
    expect((await counts()).students).toBe(0);
  });

  it("refuses an email that is taken, in any case, with a field error", async () => {
    const db = await getDb();
    await registerAccount(db, valid, local);
    for (const email of [
      "kari.nordmann@example.test",
      "KARI.NORDMANN@EXAMPLE.TEST",
    ]) {
      const error = await registerAccount(db, { ...valid, email }, local).catch(
        (e) => e,
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ code: "INVALID_INPUT", field: "email" });
    }
    expect((await counts()).students).toBe(1);
    expect(await profileCount()).toBe(1);
  });

  it("answers a lost race for one email with the same field error", async () => {
    const db = await getDb();
    const results = await Promise.allSettled([
      registerAccount(db, valid, local),
      registerAccount(db, { ...valid, name: "Annen" }, local),
    ]);
    const failed = results.filter((r) => r.status === "rejected");
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toMatchObject({
      code: "INVALID_INPUT",
      field: "email",
    });
    expect((await counts()).students).toBe(1);
  });

  it("creates the Student and the Profile in one transaction", async () => {
    const db = await getDb();
    const holder = globalThis as typeof globalThis & {
      __jobassistantCryptoKey?: Buffer;
    };
    // Without the key the profile insert fails after the Student row exists.
    holder.__jobassistantCryptoKey = undefined;
    try {
      await expect(registerAccount(db, valid, local)).rejects.toThrow(
        "crypto is not initialised",
      );
    } finally {
      initCrypto(KEY);
    }
    expect((await counts()).students).toBe(0);
    expect(await profileCount()).toBe(0);
  });
});

describe("FR-31 registerAccount on Hosted", () => {
  it("requires the Access code, checked before anything else", async () => {
    const db = await getDb();
    for (const body of [
      valid,
      { ...valid, accessCode: "wrong-code-wrong-code" },
      { ...valid, accessCode: "" },
      { ...valid, accessCode: 12 },
      // Even a body that is otherwise invalid gets the code's error first.
      { ...valid, password: "x" },
    ]) {
      const error = await registerAccount(db, body, hosted).catch((e) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: "INVALID_INPUT",
        field: "accessCode",
      });
    }
    expect((await counts()).students).toBe(0);
  });

  it("checks the code before it looks the email up", async () => {
    const db = await getDb();
    await registerAccount(db, { ...valid, accessCode: CODE }, hosted);
    const error = await registerAccount(db, valid, hosted).catch((e) => e);
    expect(error).toMatchObject({ field: "accessCode" });
  });

  it("registers with the right code, and the code is not stored", async () => {
    const db = await getDb();
    await registerAccount(db, { ...valid, accessCode: CODE }, hosted);
    const state = await counts();
    expect(state.students).toBe(1);
    expect(JSON.stringify(state)).not.toContain(CODE);
  });

  it("does not ask for the code locally", async () => {
    const db = await getDb();
    await registerAccount(db, valid, local);
    expect((await counts()).students).toBe(1);
  });
});

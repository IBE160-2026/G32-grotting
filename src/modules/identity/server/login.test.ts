import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";
import { loginAccount } from "./login";
import { registerAccount } from "./register";
import { sessions } from "./schema";

afterAll(closeDb);

const NOW = new Date("2026-11-22T10:00:00.000Z");
const local = { hosted: false, accessCode: undefined } as const;
let studentId = "";

beforeAll(async () => {
  const db = await getDb();
  ({ studentId } = await registerAccount(
    db,
    {
      name: "Kari Nordmann",
      email: "kari@example.test",
      password: "correct horse",
    },
    local,
  ));
});

async function sessionRows() {
  return (await (await getDb()).select().from(sessions)).length;
}

describe("FR-18 loginAccount", () => {
  it("returns the SessionView and a token whose SHA-256 is stored", async () => {
    const db = await getDb();
    const before = await sessionRows();
    const { token, view } = await loginAccount(
      db,
      { email: " KARI@Example.test ", password: "correct horse" },
      NOW,
    );
    expect(view).toEqual({
      studentId,
      name: "Kari Nordmann",
      email: "kari@example.test",
      noticeVersion: null,
      expiresAt: "2026-11-22T10:30:00.000Z",
    });
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(before + 1);
    expect(
      rows.some(
        (row) =>
          row.tokenHash === createHash("sha256").update(token).digest("hex"),
      ),
    ).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("answers an unknown email and a wrong password with the same error and writes nothing", async () => {
    const db = await getDb();
    const before = await sessionRows();
    const wrong = await loginAccount(
      db,
      { email: "kari@example.test", password: "wrong password" },
      NOW,
    ).catch((e) => e);
    const unknown = await loginAccount(
      db,
      { email: "nobody@example.test", password: "correct horse" },
      NOW,
    ).catch((e) => e);
    const odd = await loginAccount(
      db,
      { email: "not an email", password: "correct horse" },
      NOW,
    ).catch((e) => e);
    for (const error of [wrong, unknown, odd]) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: "INVALID_INPUT",
        field: "password",
        retryable: false,
      });
      expect(error.message).toBe("INVALID_INPUT");
    }
    expect(await sessionRows()).toBe(before);
  });

  it("refuses an empty password or email on its own field before any lookup", async () => {
    const db = await getDb();
    await expect(
      loginAccount(db, { email: "kari@example.test", password: "" }, NOW),
    ).rejects.toMatchObject({ issues: [{ path: ["password"] }] });
    await expect(
      loginAccount(db, { email: "", password: "x" }, NOW),
    ).rejects.toMatchObject({ issues: [{ path: ["email"] }] });
  });

  it("does not take a password hash for a password", async () => {
    const db = await getDb();
    const raw = await db.execute(sql`select password_hash from students`);
    const hash = JSON.stringify(raw).match(/scrypt\$[^"]+/)?.[0] ?? "";
    expect(hash).not.toBe("");
    await expect(
      loginAccount(db, { email: "kari@example.test", password: hash }, NOW),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

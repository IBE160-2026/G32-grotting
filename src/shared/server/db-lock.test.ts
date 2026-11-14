import { describe, expect, it, vi } from "vitest";
import { type Db, withAdvisoryLock } from "./db";

vi.mock("./config", () => ({
  getConfig: () => ({ db: { kind: "postgres", url: "postgres://x" } }),
}));

// Reads the SQL text of a drizzle `sql` object, enough to tell lock from unlock.
const text = (query: unknown) =>
  JSON.stringify((query as { queryChunks: unknown }).queryChunks);

function fakeDb(unlockFails = false) {
  const calls: string[] = [];
  const execute = vi.fn(async (query: unknown) => {
    const kind = text(query).includes("pg_advisory_unlock") ? "unlock" : "lock";
    calls.push(kind);
    if (kind === "unlock" && unlockFails) throw new Error("connection lost");
    return [];
  });
  return { db: { execute } as unknown as Db, calls };
}

describe("NFR-9 advisory lock on Postgres (AD-17)", () => {
  it("locks, runs the function, then unlocks", async () => {
    const { db, calls } = fakeDb();
    const result = await withAdvisoryLock(db, 1, async () => {
      calls.push("fn");
      return "done";
    });
    expect(result).toBe("done");
    expect(calls).toEqual(["lock", "fn", "unlock"]);
  });

  it("unlocks when the function throws and passes its error on", async () => {
    const { db, calls } = fakeDb();
    await expect(
      withAdvisoryLock(db, 1, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(calls).toEqual(["lock", "unlock"]);
  });

  it("does not hide the function's error when the unlock fails", async () => {
    const { db } = fakeDb(true);
    await expect(
      withAdvisoryLock(db, 1, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});

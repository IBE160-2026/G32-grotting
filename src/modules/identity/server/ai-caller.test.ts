import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runAi } from "@/modules/ai";
import {
  createProfile,
  getProfileSummary,
  saveNoticeVersion,
} from "@/modules/profile";
import { getConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";
import { aiContextFor } from "./ai-caller";

// Story 6.6: who an AI request is made for, and the cap per Student, on PGlite
// with the mock adapter (no provider is reached).

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

afterAll(closeDb);

const NOTICE = () => getConfig().aiNotice.version;
const NOW = () => new Date("2026-11-23T10:00:00.000Z");

function rowsOf(result: unknown): Record<string, unknown>[] {
  return (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as Record<string, unknown>[];
}

let counter = 0;
async function newStudent(name: string, accepted: boolean): Promise<string> {
  const db = await getDb();
  const result = await db.execute(
    sql`insert into students (email, password_hash) values (${`ai${++counter}@example.test`}, 'x') returning id`,
  );
  const id = String(rowsOf(result)[0]?.id);
  await createProfile(db, id, name);
  if (accepted) await saveNoticeVersion(id, db, NOTICE());
  return id;
}

beforeEach(async () => {
  await (await getDb()).execute(sql`delete from ai_usage`);
});

const request = {
  task: "letter",
  jobAd: "annonse",
  promptVersion: "v1",
  buildPrompt: () => "p",
  schema: z.object({ text: z.string() }),
};
// A mock adapter of our own: no provider is ever reached.
const adapter = {
  kind: "mock" as const,
  provider: "mock",
  model: "mock-1",
  async generate() {
    return {
      output: { text: "x" },
      usage: { inputTokens: 1, outputTokens: 1 },
    };
  },
};
const live = { adapter, now: NOW, testMode: false };
// At or above the Daily cap (30).
const AT_CAP = 30;

async function usage() {
  const result = await (await getDb()).execute(
    sql`select scope, count from ai_usage order by scope`,
  );
  return rowsOf(result).map((r) => ({ scope: r.scope, count: r.count }));
}

describe("aiContextFor without a session (accounts off)", () => {
  it("is the installation with the body's consent", async () => {
    const db = await getDb();
    expect(await aiContextFor(undefined, { noticeVersion: "n" }, db)).toEqual({
      studentId: null,
      consent: { noticeVersion: "n" },
    });
    expect(await aiContextFor(undefined, null, db)).toEqual({
      studentId: null,
      consent: null,
    });
    expect(await aiContextFor(undefined, undefined, db)).toEqual({
      studentId: null,
      consent: null,
    });
  });
});

describe("aiContextFor with a session", () => {
  it("takes the Student from the session and the consent from the Profile", async () => {
    const db = await getDb();
    const id = await newStudent("Anna Aas", true);
    expect(await aiContextFor({ studentId: id }, null, db)).toEqual({
      studentId: id,
      consent: { noticeVersion: NOTICE() },
    });
  });

  it("has no consent while the Profile holds no version, whatever the body says", async () => {
    const db = await getDb();
    const id = await newStudent("Anna Aas", false);
    expect(
      await aiContextFor({ studentId: id }, { noticeVersion: NOTICE() }, db),
    ).toEqual({ studentId: id, consent: null });
  });

  it("ignores a body consent that differs from the stored one", async () => {
    const db = await getDb();
    const id = await newStudent("Anna Aas", true);
    expect(
      (await aiContextFor({ studentId: id }, { noticeVersion: "other" }, db))
        .consent,
    ).toEqual({ noticeVersion: NOTICE() });
  });

  it("throws SESSION_EXPIRED for a Student with no Profile", async () => {
    const db = await getDb();
    await expect(
      aiContextFor(
        { studentId: "00000000-0000-4000-8000-000000000000" },
        null,
        db,
      ),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    await expect(
      aiContextFor(
        { studentId: "00000000-0000-4000-8000-000000000000" },
        null,
        db,
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("does not read the CV text (summary has no such field)", async () => {
    const db = await getDb();
    const id = await newStudent("Anna Aas", true);
    expect(Object.keys((await getProfileSummary(id, db)) ?? {})).toEqual([
      "name",
      "noticeVersion",
    ]);
  });
});

describe("another Student", () => {
  it("has no consent from the first Student's acceptance", async () => {
    const db = await getDb();
    const a = await newStudent("Anna Aas", true);
    const b = await newStudent("Bjørn Berg", false);
    const ctxB = await aiContextFor({ studentId: b }, null, db);
    expect(ctxB.consent).toBeNull();
    const result = await runAi(request, ctxB, live);
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_NOTICE_REQUIRED", retryable: false },
    });
    expect(await usage()).toEqual([]);
    const ctxA = await aiContextFor({ studentId: a }, null, db);
    expect((await runAi(request, ctxA, live)).ok).toBe(true);
  });

  it("counts on its own scope, and A at the cap does not stop B", async () => {
    const db = await getDb();
    const a = await newStudent("Anna Aas", true);
    const b = await newStudent("Bjørn Berg", true);
    await db.execute(
      sql`insert into ai_usage (scope, day, count) values (${a}, '2026-11-23', ${AT_CAP})`,
    );
    const ctxA = await aiContextFor({ studentId: a }, null, db);
    const ctxB = await aiContextFor({ studentId: b }, null, db);
    expect(await runAi(request, ctxA, live)).toEqual({
      ok: false,
      error: { code: "DAILY_CAP_REACHED", retryable: false },
    });
    expect((await runAi(request, ctxB, live)).ok).toBe(true);
    const rows = await usage();
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { scope: a, count: AT_CAP },
        { scope: b, count: 1 },
      ]),
    );
  });
});

import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveAnalysis,
  saveGaps,
  saveLetter,
  saveLetterCheck,
} from "@/modules/application";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import { ACCOUNTS_ENV, signUp } from "../../../../../test/accounts-kit";

// Story 6.9: GET /api/applications/[id], one stored Application. FR-19: another
// Student's id, an unknown id and a malformed id answer the same NOT_FOUND.

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const { POST: register } = await import("../../auth/register/route");
const { POST: login } = await import("../../auth/login/route");
const { GET } = await import("./route");

const get = (id: string, cookie?: string) =>
  GET(
    new Request(`http://localhost/api/applications/${id}`, {
      headers: cookie ? { cookie: `ja_sid=${cookie}` } : {},
    }),
    { params: Promise.resolve({ id }) },
  );

const FIRST = "00000000-0000-4000-8000-000000000001";
const SECOND = "00000000-0000-4000-8000-000000000002";
const UNKNOWN = "00000000-0000-4000-8000-000000000003";

const ANALYSIS = {
  keywordSource: "code",
  score: 50,
  matchedCount: 1,
  totalCount: 2,
  adParagraphs: 1,
  formula: {
    key: "MATCH_FORMULA",
    params: { matched: 1, total: 2, score: 50 },
  },
  matched: [],
  missing: [],
} as never;

const LETTER = {
  text: "Kjære Fjord Analytics, hemmeligbrev {{SIGNATUR}}",
  tone: "Direkte",
  rev: 1,
} as const;

async function saveFor(studentId: string, id: string, employer: string) {
  const db = await getDb();
  await saveAnalysis(studentId, db, {
    id,
    fingerprint: id,
    job: { jobAd: "Hemmelig annonse", jobTitle: "Utvikler", employer },
    analysis: ANALYSIS,
  });
}

beforeEach(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

async function answer(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    headers: [...response.headers.entries()]
      .filter(([name]) => name !== "x-session-expires-at")
      .sort(),
  };
}

describe("GET /api/applications/[id]", () => {
  it("returns the Student's own Application with every section, no-store", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    const db = await getDb();
    await saveFor(a.studentId, FIRST, "Fjord Analytics");
    await saveFor(a.studentId, SECOND, "Nordic Digital");
    const target = { id: SECOND, fingerprint: SECOND };
    await saveGaps(a.studentId, db, { ...target, gapsRev: 1 }, []);
    await saveLetter(a.studentId, db, target, LETTER);
    await saveLetterCheck(
      a.studentId,
      db,
      { ...target, letterRev: 1, gapsRev: 1 },
      { flags: [], letterRev: 1, gapsRev: 1 },
    );
    const response = await get(SECOND, a.token);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as {
      ok: boolean;
      data: Record<string, unknown>;
    };
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({
      id: SECOND,
      seq: 2,
      previous: { id: FIRST, seq: 1, employer: "Fjord Analytics" },
      job: {
        status: "ok",
        value: { jobTitle: "Utvikler", employer: "Nordic Digital" },
      },
      letter: { status: "ok", value: LETTER },
      gaps: { status: "ok", value: [] },
      check: [],
    });
    expect(JSON.stringify(body.data)).not.toContain("cvText");
  });

  it("answers the same NOT_FOUND for another Student's id, an unknown id and a malformed id", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    const b = await signUp(register, login, "Bjørn Berg", "b@example.test");
    await saveFor(a.studentId, FIRST, "Fjord Analytics");
    await saveFor(b.studentId, SECOND, "Nordic Digital");
    const foreign = await answer(await get(FIRST, b.token));
    expect(foreign.status).toBe(404);
    expect(foreign.body).not.toContain("Fjord");
    expect(foreign.body).toContain("NOT_FOUND");
    for (const id of [UNKNOWN, "not-a-uuid", "..%2F..%2Fx"]) {
      expect(await answer(await get(id, b.token))).toEqual(foreign);
    }
  });

  it("answers an unreadable section as such and keeps the rest", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    await saveFor(a.studentId, FIRST, "Fjord Analytics");
    await (await getDb()).execute(
      sql`update applications set job = 'garbage' where id = ${FIRST}`,
    );
    const response = await get(FIRST, a.token);
    expect(response.status).toBe(200);
    expect(
      ((await response.json()) as { data: Record<string, unknown> }).data,
    ).toMatchObject({
      job: { status: "unreadable" },
      analysis: { status: "ok" },
      letter: { status: "missing" },
    });
  });

  it("answers SESSION_EXPIRED without a live session and NOT_FOUND with accounts off", async () => {
    expect((await get(FIRST)).status).toBe(401);
    expect((await get(FIRST, "bogus-token")).status).toBe(401);
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    expect((await get(FIRST)).status).toBe(404);
  });
});

import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { saveAnalysis, saveLetter } from "@/modules/application";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import { ACCOUNTS_ENV, signUp } from "../../../../test/accounts-kit";

// Story 6.8: GET /api/applications (the register of Historikk), accounts on and
// off, with two Students (FR-19).

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const { POST: register } = await import("../auth/register/route");
const { POST: login } = await import("../auth/login/route");
const { GET } = await import("./route");

const get = (cookie?: string, query = "") =>
  GET(
    new Request(`http://localhost/api/applications${query}`, {
      headers: cookie ? { cookie: `ja_sid=${cookie}` } : {},
    }),
  );

const analysis = {
  keywordSource: "code",
  score: 50,
  matchedCount: 3,
  totalCount: 6,
  adParagraphs: 1,
  formula: {
    key: "MATCH_FORMULA",
    params: { matched: 3, total: 6, score: 50 },
  },
  matched: [
    {
      term: "Hemmelignøkkelord",
      stage: "exact",
      positions: [],
      evidence: {
        stage: "exact",
        line: 1,
        text: "Hemmeligbevis",
        start: 0,
        end: 1,
      },
    },
  ],
  missing: [],
};

let counter = 0;
async function saveFor(studentId: string, title: string, withLetter = false) {
  const db = await getDb();
  const id = `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;
  const result = await saveAnalysis(studentId, db, {
    id,
    fingerprint: id,
    job: {
      jobAd: "Hemmeligannonse for en utvikler.",
      jobTitle: title,
      employer: "Fjord AS",
    },
    analysis: analysis as never,
  });
  expect(result.status).toBe("saved");
  if (withLetter) {
    await saveLetter(
      studentId,
      db,
      { id, fingerprint: id },
      { text: "Hemmeligbrev {{SIGNATUR}}", tone: "Formell", rev: 1 },
    );
  }
  return id;
}

beforeEach(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

type Body = {
  ok: boolean;
  data: Record<string, unknown> & { entries: Array<Record<string, unknown>> };
};

describe("GET /api/applications", () => {
  it("lists the Student's entries newest first, with the total and the range", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    await saveFor(a.studentId, "Første");
    await saveFor(a.studentId, "Andre", true);
    const response = await get(a.token);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as Body;
    expect(body.data).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 2,
      firstSeq: 1,
      lastSeq: 2,
    });
    expect(body.data.entries.map((entry) => entry.jobTitle)).toEqual([
      "Andre",
      "Første",
    ]);
    expect(body.data.entries.map((entry) => entry.hasLetter)).toEqual([
      true,
      false,
    ]);
  });

  it("does not show another Student's entries (FR-19) and the answer holds no text beyond the row", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    const b = await signUp(register, login, "Bjørn Berg", "b@example.test");
    await saveFor(a.studentId, "Annas stilling", true);
    const mine = (await (await get(b.token)).json()) as Body;
    expect(mine.data.total).toBe(0);
    expect(mine.data.entries).toEqual([]);
    const text = await (await get(a.token)).text();
    for (const word of [
      "Hemmeligannonse",
      "Hemmeligbrev",
      "Hemmelignøkkelord",
      "Hemmeligbevis",
      "SIGNATUR",
    ]) {
      expect(text).not.toContain(word);
    }
    // A student id in the query is not read.
    const other = await get(b.token, `?studentId=${a.studentId}`);
    expect(((await other.json()) as Body).data.total).toBe(0);
  });

  it("pages by the page query and rejects one that is not a whole page number", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    for (let n = 1; n <= 21; n++) await saveFor(a.studentId, `Stilling ${n}`);
    const second = (await (await get(a.token, "?page=2")).json()) as Body;
    expect(second.data.entries.map((entry) => entry.seq)).toEqual([1]);
    expect(second.data.total).toBe(21);
    for (const bad of ["?page=0", "?page=-1", "?page=abc", "?page=1.5"]) {
      const response = await get(a.token, bad);
      expect(response.status).toBe(400);
    }
  });

  it("answers SESSION_EXPIRED without a live session", async () => {
    for (const cookie of [undefined, "bogus-token"]) {
      const response = await get(cookie);
      expect(response.status).toBe(401);
      expect(
        ((await response.json()) as { error: { code: string } }).error.code,
      ).toBe("SESSION_EXPIRED");
    }
  });

  it("answers NOT_FOUND with accounts off", async () => {
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    const response = await get();
    expect(response.status).toBe(404);
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe("NOT_FOUND");
  });
});

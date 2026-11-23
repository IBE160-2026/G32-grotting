import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { saveAnalysis } from "@/modules/application";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import { ACCOUNTS_ENV, signUp } from "../../../../../test/accounts-kit";

// Story 6.7: GET /api/applications/next with accounts on and off.

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const { POST: register } = await import("../../auth/register/route");
const { POST: login } = await import("../../auth/login/route");
const { GET } = await import("./route");

const get = (cookie?: string) =>
  GET(
    new Request("http://localhost/api/applications/next", {
      headers: cookie ? { cookie: `ja_sid=${cookie}` } : {},
    }),
  );

const analysis = {
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
};

async function saveFor(studentId: string, id: string) {
  const result = await saveAnalysis(studentId, await getDb(), {
    id,
    fingerprint: id,
    job: { jobAd: "x", jobTitle: "y", employer: "z" },
    analysis: analysis as never,
  });
  expect(result.status).toBe("saved");
}

beforeEach(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

describe("GET /api/applications/next", () => {
  it("answers 1 when the Student has no Application, then max plus one", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    const b = await signUp(register, login, "Bjørn Berg", "b@example.test");
    const first = await get(a.token);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, data: { seq: 1 } });
    await saveFor(a.studentId, "00000000-0000-4000-8000-000000000001");
    await saveFor(a.studentId, "00000000-0000-4000-8000-000000000002");
    expect(
      ((await (await get(a.token)).json()) as { data: unknown }).data,
    ).toEqual({ seq: 3 });
    // Another Student's rows do not count.
    expect(
      ((await (await get(b.token)).json()) as { data: unknown }).data,
    ).toEqual({ seq: 1 });
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

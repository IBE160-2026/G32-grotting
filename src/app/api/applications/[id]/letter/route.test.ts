import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { saveAnalysis, saveLetter } from "@/modules/application";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import { ACCOUNTS_ENV, signUp } from "../../../../../../test/accounts-kit";

// Story 6.8: GET /api/applications/[id]/letter, the stored Letter of one
// Historikk row. FR-19: another Student's id, an unknown id, a malformed id and
// an entry without a Letter all answer the same NOT_FOUND.

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const { POST: register } = await import("../../../auth/register/route");
const { POST: login } = await import("../../../auth/login/route");
const { GET } = await import("./route");

const get = (id: string, cookie?: string) =>
  GET(
    new Request(`http://localhost/api/applications/${id}/letter`, {
      headers: cookie ? { cookie: `ja_sid=${cookie}` } : {},
    }),
    { params: Promise.resolve({ id }) },
  );

const WITH_LETTER = "00000000-0000-4000-8000-000000000001";
const WITHOUT_LETTER = "00000000-0000-4000-8000-000000000002";
const UNKNOWN = "00000000-0000-4000-8000-000000000003";

async function saveFor(studentId: string, id: string, withLetter: boolean) {
  const db = await getDb();
  await saveAnalysis(studentId, db, {
    id,
    fingerprint: id,
    job: { jobAd: "x", jobTitle: "y", employer: "z" },
    analysis: { score: 10 } as never,
  });
  if (withLetter) {
    await saveLetter(
      studentId,
      db,
      { id, fingerprint: id },
      { text: "Kjære Fjord, {{SIGNATUR}}", tone: "Direkte", rev: 1 },
    );
  }
}

beforeEach(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

async function answer(response: Response) {
  return { status: response.status, body: await response.text() };
}

describe("GET /api/applications/[id]/letter", () => {
  it("returns the Student's own Letter text, the sign-off token still in it", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    await saveFor(a.studentId, WITH_LETTER, true);
    const response = await get(WITH_LETTER, a.token);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      data: { text: "Kjære Fjord, {{SIGNATUR}}" },
    });
  });

  it("answers the same NOT_FOUND for another Student's id, an unknown id, a malformed id and an entry without a Letter", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    const b = await signUp(register, login, "Bjørn Berg", "b@example.test");
    await saveFor(a.studentId, WITH_LETTER, true);
    await saveFor(b.studentId, WITHOUT_LETTER, false);
    const foreign = await answer(await get(WITH_LETTER, b.token));
    expect(foreign.status).toBe(404);
    expect(foreign.body).not.toContain("Kjære");
    for (const id of [UNKNOWN, "not-a-uuid", "..%2F..%2Fx", WITHOUT_LETTER]) {
      expect(await answer(await get(id, b.token))).toEqual(foreign);
    }
  });

  it("answers SESSION_EXPIRED without a live session and NOT_FOUND with accounts off", async () => {
    expect((await get(WITH_LETTER)).status).toBe(401);
    expect((await get(WITH_LETTER, "bogus-token")).status).toBe(401);
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    expect((await get(WITH_LETTER)).status).toBe(404);
  });
});

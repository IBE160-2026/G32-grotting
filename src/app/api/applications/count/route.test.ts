import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { saveAnalysis } from "@/modules/application";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import { ACCOUNTS_ENV, signUp } from "../../../../../test/accounts-kit";

// Story 6.8: GET /api/applications/count, the number by «Historikk».

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
    new Request("http://localhost/api/applications/count", {
      headers: cookie ? { cookie: `ja_sid=${cookie}` } : {},
    }),
  );

beforeEach(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

describe("GET /api/applications/count", () => {
  it("counts the Student's own entries only", async () => {
    const a = await signUp(register, login, "Anna Aas", "a@example.test");
    const b = await signUp(register, login, "Bjørn Berg", "b@example.test");
    expect(await (await get(a.token)).json()).toEqual({
      ok: true,
      data: { total: 0 },
    });
    await saveAnalysis(a.studentId, await getDb(), {
      id: "00000000-0000-4000-8000-000000000001",
      fingerprint: "x",
      job: { jobAd: "x", jobTitle: "y", employer: "z" },
      analysis: { score: 10 } as never,
    });
    expect(
      ((await (await get(a.token)).json()) as { data: unknown }).data,
    ).toEqual({ total: 1 });
    expect(
      ((await (await get(b.token)).json()) as { data: unknown }).data,
    ).toEqual({ total: 0 });
  });

  it("answers SESSION_EXPIRED without a live session and NOT_FOUND with accounts off", async () => {
    expect((await get()).status).toBe(401);
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    expect((await get()).status).toBe(404);
  });
});

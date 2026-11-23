import { sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import {
  ACCOUNTS_ENV,
  jsonRequest,
  signUp,
} from "../../../../test/accounts-kit";

// Story 6.6: POST /api/analyses with accounts on. The resolver is replaced, so
// no request of any kind is made; the test sees what the route hands it.

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const analyseInputs = vi.fn();
vi.mock("@/modules/application", () => ({
  analyseInputs: (...args: unknown[]) => analyseInputs(...args),
}));

const { POST: register } = await import("../auth/register/route");
const { POST: login } = await import("../auth/login/route");
const { POST: acceptNotice } = await import("../profile/ai-notice/route");
const { POST } = await import("./route");

const inputs = {
  cvText: "c".repeat(200),
  jobAd: "a".repeat(200),
  jobTitle: "Utvikler",
  employer: "Nordic Digital",
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

const post = (cookie: string | undefined, body: Record<string, unknown>) =>
  POST(
    jsonRequest("/api/analyses", {
      cookie,
      body: { applicationId, inputs, ...body },
    }),
  );

async function ctxSeen(cookie: string, body: Record<string, unknown> = {}) {
  analyseInputs.mockClear();
  analyseInputs.mockResolvedValue({ ok: false, error: "TOO_FEW_KEYWORDS" });
  await post(cookie, body);
  expect(analyseInputs).toHaveBeenCalledTimes(1);
  return analyseInputs.mock.calls[0]?.[2]?.ai?.ctx;
}

beforeEach(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  analyseInputs.mockReset();
  await (await getDb()).execute(sql`delete from students`);
});

afterEach(() => vi.restoreAllMocks());
afterAll(closeDb);

describe("POST /api/analyses with accounts on", () => {
  it("answers SESSION_EXPIRED and runs nothing without a live session", async () => {
    for (const cookie of [undefined, "bogus-token"]) {
      const response = await post(cookie, {});
      expect(response.status).toBe(401);
      expect(
        ((await response.json()) as { error: { code: string } }).error.code,
      ).toBe("SESSION_EXPIRED");
    }
    expect(analyseInputs).not.toHaveBeenCalled();
  });

  it("passes the session's Student and no consent until the notice is accepted", async () => {
    const { studentId, token } = await signUp(
      register,
      login,
      "Anna Aas",
      "anna@example.test",
    );
    expect(await ctxSeen(token)).toEqual({ studentId, consent: null });
  });

  it("ignores a body consent and a body studentId", async () => {
    const { studentId, token } = await signUp(
      register,
      login,
      "Anna Aas",
      "anna@example.test",
    );
    expect(
      await ctxSeen(token, {
        consent: { noticeVersion: current.aiNotice.version },
        studentId: "00000000-0000-4000-8000-000000000000",
      }),
    ).toEqual({ studentId, consent: null });
  });

  it("reads the consent from the Profile after the notice was accepted", async () => {
    const { studentId, token } = await signUp(
      register,
      login,
      "Anna Aas",
      "anna@example.test",
    );
    const accepted = await acceptNotice(
      jsonRequest("/api/profile/ai-notice", {
        cookie: token,
        body: { noticeVersion: current.aiNotice.version },
      }),
    );
    expect(accepted.status).toBe(200);
    expect(await ctxSeen(token)).toEqual({
      studentId,
      consent: { noticeVersion: current.aiNotice.version },
    });
  });

  it("gives another Student none of the first Student's consent", async () => {
    const a = await signUp(register, login, "Anna Aas", "anna@example.test");
    const b = await signUp(register, login, "Bjørn Berg", "bjorn@example.test");
    await acceptNotice(
      jsonRequest("/api/profile/ai-notice", {
        cookie: a.token,
        body: { noticeVersion: current.aiNotice.version },
      }),
    );
    expect(await ctxSeen(b.token)).toEqual({
      studentId: b.studentId,
      consent: null,
    });
  });

  it("is as after Epic 5 with accounts off: no session, no Student, the body's consent", async () => {
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    analyseInputs.mockResolvedValue({ ok: false, error: "TOO_FEW_KEYWORDS" });
    await post(undefined, { consent: { noticeVersion: "n" } });
    expect(analyseInputs.mock.calls[0]?.[2]).toEqual({
      ai: { ctx: { studentId: null, consent: { noticeVersion: "n" } } },
    });
  });
});

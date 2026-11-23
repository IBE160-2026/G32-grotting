import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import {
  ACCOUNTS_ENV,
  jsonRequest,
  signUp,
} from "../../../../../../test/accounts-kit";

// Story 6.6: POST /api/analyses/[id]/letter with accounts on. Phase 1 and the
// Letter generator are replaced, so no request of any kind is made; the test
// sees the context the route hands the generator.

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
const generateLetter = vi.fn();
vi.mock("@/modules/letter", () => ({
  generateLetter: (...args: unknown[]) => generateLetter(...args),
}));

const { POST: register } = await import("../../../auth/register/route");
const { POST: login } = await import("../../../auth/login/route");
const { POST: acceptNotice } = await import("../../../profile/ai-notice/route");
const { POST } = await import("./route");

const inputs = {
  cvText: "c".repeat(200),
  jobAd: "a".repeat(200),
  jobTitle: "Utvikler",
  employer: "Nordic Digital",
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

function post(cookie: string | undefined, extra: Record<string, unknown> = {}) {
  return POST(
    jsonRequest(`/api/analyses/${applicationId}/letter`, {
      cookie,
      body: {
        applicationId,
        fingerprint: "f",
        inputs,
        tone: "Formell",
        consent: null,
        ...extra,
      },
    }),
    { params: Promise.resolve({ id: applicationId }) },
  );
}

beforeEach(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  analyseInputs.mockReset();
  generateLetter.mockReset();
  analyseInputs.mockResolvedValue({
    ok: true,
    value: { fingerprint: "f", result: { matched: [] } },
  });
  generateLetter.mockResolvedValue({
    ok: false,
    error: { code: "AI_NOTICE_REQUIRED", retryable: false },
  });
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

const accept = (cookie: string) =>
  acceptNotice(
    jsonRequest("/api/profile/ai-notice", {
      cookie,
      body: { noticeVersion: current.aiNotice.version },
    }),
  );

describe("POST /api/analyses/[id]/letter with accounts on", () => {
  it("answers SESSION_EXPIRED and runs nothing without a live session", async () => {
    for (const cookie of [undefined, "bogus-token"]) {
      const response = await post(cookie);
      expect(response.status).toBe(401);
      expect(
        ((await response.json()) as { error: { code: string } }).error.code,
      ).toBe("SESSION_EXPIRED");
    }
    expect(analyseInputs).not.toHaveBeenCalled();
    expect(generateLetter).not.toHaveBeenCalled();
  });

  it("hands the generator the session Student and no consent before the notice", async () => {
    const { studentId, token } = await signUp(
      register,
      login,
      "Anna Aas",
      "anna@example.test",
    );
    const response = await post(token, {
      consent: { noticeVersion: current.aiNotice.version },
    });
    expect(response.status).toBe(403);
    expect(generateLetter.mock.calls[0]?.[1]).toEqual({
      studentId,
      consent: null,
    });
  });

  it("reads the consent from the Profile once the notice is accepted", async () => {
    const { studentId, token } = await signUp(
      register,
      login,
      "Anna Aas",
      "anna@example.test",
    );
    await accept(token);
    await post(token);
    expect(generateLetter.mock.calls[0]?.[1]).toEqual({
      studentId,
      consent: { noticeVersion: current.aiNotice.version },
    });
  });

  it("gives another Student neither the consent nor the Student id of the first", async () => {
    const a = await signUp(register, login, "Anna Aas", "anna@example.test");
    const b = await signUp(register, login, "Bjørn Berg", "bjorn@example.test");
    await accept(a.token);
    await post(b.token, {
      consent: { noticeVersion: current.aiNotice.version },
      studentId: a.studentId,
    });
    expect(generateLetter.mock.calls[0]?.[1]).toEqual({
      studentId: b.studentId,
      consent: null,
    });
  });

  it("is as after Epic 5 with accounts off", async () => {
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    await post(undefined, { consent: { noticeVersion: "n" } });
    expect(generateLetter.mock.calls[0]?.[1]).toEqual({
      studentId: null,
      consent: { noticeVersion: "n" },
    });
  });
});

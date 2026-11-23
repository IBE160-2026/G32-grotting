import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import {
  ACCOUNTS_ENV,
  jsonRequest,
  signUp,
} from "../../../../../../test/accounts-kit";

// Story 6.6: POST /api/analyses/[id]/gaps with accounts on. Phase 1 and the Gap
// analysis are replaced, so no request of any kind is made.

let current: Config;
vi.mock("@/shared/server/config", async (original) => {
  const actual = await original<typeof import("@/shared/server/config")>();
  return {
    ...actual,
    getConfig: () => ({
      ...current,
      features: { ...current.features, gaps: true },
    }),
  };
});
vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const analyseInputs = vi.fn();
vi.mock("@/modules/application", () => ({
  analyseInputs: (...args: unknown[]) => analyseInputs(...args),
}));
const analyseGaps = vi.fn();
vi.mock("@/modules/gaps", () => ({
  analyseGaps: (...args: unknown[]) => analyseGaps(...args),
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
    jsonRequest(`/api/analyses/${applicationId}/gaps`, {
      cookie,
      body: {
        applicationId,
        fingerprint: "f",
        inputs,
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
  analyseGaps.mockReset();
  analyseInputs.mockResolvedValue({
    ok: true,
    value: { fingerprint: "f", result: { missing: [] } },
  });
  analyseGaps.mockResolvedValue({
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

describe("POST /api/analyses/[id]/gaps with accounts on", () => {
  it("answers SESSION_EXPIRED and runs nothing without a live session", async () => {
    for (const cookie of [undefined, "bogus-token"]) {
      const response = await post(cookie);
      expect(response.status).toBe(401);
    }
    expect(analyseInputs).not.toHaveBeenCalled();
    expect(analyseGaps).not.toHaveBeenCalled();
  });

  it("hands the analysis the session Student and no consent before the notice", async () => {
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
    expect(analyseGaps.mock.calls[0]?.[1]).toEqual({
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
    expect(analyseGaps.mock.calls[0]?.[1]).toEqual({
      studentId,
      consent: { noticeVersion: current.aiNotice.version },
    });
  });

  it("gives another Student neither the consent nor the Student id of the first", async () => {
    const a = await signUp(register, login, "Anna Aas", "anna@example.test");
    const b = await signUp(register, login, "Bjørn Berg", "bjorn@example.test");
    await accept(a.token);
    await post(b.token, { studentId: a.studentId });
    expect(analyseGaps.mock.calls[0]?.[1]).toEqual({
      studentId: b.studentId,
      consent: null,
    });
  });

  it("is as after Epic 5 with accounts off", async () => {
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    await post(undefined, { consent: { noticeVersion: "n" } });
    expect(analyseGaps.mock.calls[0]?.[1]).toEqual({
      studentId: null,
      consent: { noticeVersion: "n" },
    });
  });
});

import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Config, parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import {
  ACCOUNTS_ENV,
  jsonRequest,
  signUp,
} from "../../../../../../test/accounts-kit";

// Story 6.6: the check makes no AI call but, with accounts on, it needs a live
// session like the other phase-2 routes.

let current: Config;
vi.mock("@/shared/server/config", async (original) => ({
  ...(await original<typeof import("@/shared/server/config")>()),
  getConfig: () => current,
}));
vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const checkLetterFor = vi.fn();
vi.mock("@/modules/application", () => ({
  checkLetterFor: (...args: unknown[]) => checkLetterFor(...args),
}));

const { POST: register } = await import("../../../auth/register/route");
const { POST: login } = await import("../../../auth/login/route");
const { POST } = await import("./route");

const inputs = {
  cvText: "c".repeat(200),
  jobAd: "a".repeat(200),
  jobTitle: "Utvikler",
  employer: "Nordic Digital",
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

const post = (cookie: string | undefined) =>
  POST(
    jsonRequest(`/api/analyses/${applicationId}/letter-check`, {
      cookie,
      body: {
        applicationId,
        fingerprint: "f",
        inputs,
        letter: { text: "Hei", tone: "Formell", rev: 1 },
        gaps: null,
        letterRev: 1,
        gapsRev: 0,
      },
    }),
    { params: Promise.resolve({ id: applicationId }) },
  );

beforeEach(async () => {
  current = parseConfig(ACCOUNTS_ENV);
  checkLetterFor.mockReset();
  checkLetterFor.mockResolvedValue({ ok: true, value: { flags: [] } });
  await (await getDb()).execute(sql`delete from students`);
});

afterAll(closeDb);

describe("POST /api/analyses/[id]/letter-check with accounts on", () => {
  it("answers SESSION_EXPIRED and runs nothing without a live session", async () => {
    for (const cookie of [undefined, "bogus-token"]) {
      const response = await post(cookie);
      expect(response.status).toBe(401);
    }
    expect(checkLetterFor).not.toHaveBeenCalled();
  });

  it("runs the check for a live session", async () => {
    const { token } = await signUp(
      register,
      login,
      "Anna Aas",
      "anna@example.test",
    );
    const response = await post(token);
    expect(response.status).toBe(200);
    expect(response.headers.has("X-Session-Expires-At")).toBe(true);
    expect(checkLetterFor).toHaveBeenCalledTimes(1);
  });

  it("needs no session with accounts off", async () => {
    current = parseConfig({ ...ACCOUNTS_ENV, FEATURE_ACCOUNTS: "false" });
    expect((await post(undefined)).status).toBe(200);
  });
});

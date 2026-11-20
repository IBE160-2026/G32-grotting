import { describe, expect, it, vi } from "vitest";

// FR-5b, FR-24: what the route hands on as the Student's consent. The resolver
// is replaced, so no request of any kind is made.
const analyseInputs = vi.fn();
vi.mock("@/modules/application", () => ({
  analyseInputs: (...args: unknown[]) => analyseInputs(...args),
}));

import { POST } from "./route";

const inputs = {
  cvText: "c".repeat(200),
  jobAd: "a".repeat(200),
  jobTitle: "Utvikler",
  employer: "Nordic Digital",
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/analyses", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

async function consentSeen(body: Record<string, unknown>) {
  analyseInputs.mockClear();
  analyseInputs.mockResolvedValue({ ok: false, error: "TOO_FEW_KEYWORDS" });
  await post({ applicationId, inputs, ...body });
  expect(analyseInputs).toHaveBeenCalledTimes(1);
  return analyseInputs.mock.calls[0]?.[2];
}

describe("FR-5b POST /api/analyses hands the consent to phase 1", () => {
  it("passes the accepted notice version as the consent of the AI request, with no Student", async () => {
    expect(
      await consentSeen({
        consent: { noticeVersion: "notice-3:x:unknown:fallback" },
      }),
    ).toEqual({
      ai: {
        ctx: {
          studentId: null,
          consent: { noticeVersion: "notice-3:x:unknown:fallback" },
        },
      },
    });
  });

  it("passes no consent when the body has none or null", async () => {
    const none = { ai: { ctx: { studentId: null, consent: null } } };
    expect(await consentSeen({})).toEqual(none);
    expect(await consentSeen({ consent: null })).toEqual(none);
  });
});

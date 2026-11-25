import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyseInputs } from "@/modules/application";
import { loadVocabulary } from "@/shared/server/data-files";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

import { POST } from "./route";

// The route on the real cached adapter: in a test run no key exists, so the
// config is in Test mode and `runAi` reads the Cached Letters (FR-27).
const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const inputs = {
  cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${dir}/ad.txt`, "utf8"),
  jobTitle: meta.jobTitle,
  employer: meta.employer,
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

async function post(changed: Partial<typeof inputs> = {}, tone = "Formell") {
  const sent = { ...inputs, ...changed };
  const analysed = await analyseInputs(sent, await loadVocabulary());
  if (!analysed.ok) throw new Error("must analyse");
  return POST(
    new Request(`http://localhost/api/analyses/${applicationId}/letter`, {
      method: "POST",
      body: JSON.stringify({
        applicationId,
        fingerprint: analysed.value.fingerprint,
        inputs: sent,
        tone,
        consent: null,
      }),
    }),
    { params: Promise.resolve({ id: applicationId }) },
  );
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Accounts are on by default since Story 6.12. This test is about the
// account-less behaviour of the route, so it sets the flag off explicitly.
vi.stubEnv("FEATURE_ACCOUNTS", "false");

describe("FR-27 POST /api/analyses/[id]/letter in Test mode", () => {
  it.each(["Formell", "Personlig", "Direkte"])(
    "answers the Example pair with its %s Cached Letter",
    async (tone) => {
      const response = await post({}, tone);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.letter).toMatchObject({ tone, rev: 1 });
      expect(json.data.letter.text).toContain("{{SIGNATUR}}");
      expect(json.data.meta).toMatchObject({
        source: "cached",
        promptVersion: "letter-1",
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("answers 502 TEST_MODE_UNAVAILABLE, not retryable, for another employer", async () => {
    const response = await post({ employer: "Fjord Analytics" });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "TEST_MODE_UNAVAILABLE", retryable: false },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

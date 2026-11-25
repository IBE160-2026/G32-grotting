import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findKeyword,
  normalise,
  proposeKeywords,
} from "@/modules/keywords/core";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { getDb } from "@/shared/server/db";
import { POST } from "./route";

const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const cachedList = JSON.parse(
  readFileSync(`${dir}/cached/keywords.json`, "utf8"),
) as { data: { keywords: string[] } };
const inputs = {
  cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${dir}/ad.txt`, "utf8"),
  jobTitle: meta.jobTitle,
  employer: meta.employer,
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/analyses", {
      method: "POST",
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

async function invalid(response: Response, field?: string) {
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    ok: false,
    error: { code: "INVALID_INPUT", field, retryable: false },
  });
}

const lower = (words: string[]) => words.map(normalise);

afterEach(() => {
  vi.unstubAllGlobals();
});

// Each test starts with no saved list.
beforeEach(async () => {
  await (await getDb()).execute(sql`delete from keyword_lists`);
});

// Accounts are on by default since Story 6.12. This test is about the
// account-less behaviour of the route, so it sets the flag off explicitly.
vi.stubEnv("FEATURE_ACCOUNTS", "false");

describe("FR-4, FR-7 POST /api/analyses", () => {
  it("FR-5b scores the Example pair on its Cached Keyword list in Test mode, as `saved`, without a network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await post({ applicationId, inputs });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    const { result, fingerprint } = body.data;
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result.keywordSource).toBe("saved");
    // The engine is the oracle: the Cached list, checked against the ad, then
    // looked up in the CV.
    const list = proposeKeywords(
      inputs.jobAd,
      cachedList.data.keywords,
      vocabulary,
    );
    const found = (yes: boolean) =>
      lower(
        list
          .filter(
            (k) => findKeyword(inputs.cvText, k, vocabulary).length > 0 === yes,
          )
          .map((k) => k.term),
      ).sort();
    expect(
      lower(result.matched.map((k: { term: string }) => k.term)).sort(),
    ).toEqual(found(true));
    expect(
      lower(result.missing.map((k: { term: string }) => k.term)).sort(),
    ).toEqual(found(false));
    expect(result.score).toBe(
      Math.round((100 * found(true).length) / list.length),
    );
    expect(result).not.toHaveProperty("verdict");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("FR-5b uses the code list, marked `code-fallback`, for an ad that is not a Fixture in Test mode", async () => {
    const jobAd = `${inputs.jobAd}

Et avsnitt som ikke finnes i noen Fixture.`;
    const body = await (
      await post({ applicationId, inputs: { ...inputs, jobAd } })
    ).json();
    expect(body.data.result.keywordSource).toBe("code-fallback");
  });

  it("FR-5b takes a consent in the body, whatever version it names, and refuses one that is no string", async () => {
    const withConsent = await post({
      applicationId,
      inputs,
      consent: { noticeVersion: "notice-0:old" },
    });
    expect(withConsent.status).toBe(200);
    expect((await post({ applicationId, inputs, consent: null })).status).toBe(
      200,
    );
    await invalid(
      await post({ applicationId, inputs, consent: { noticeVersion: 3 } }),
      "consent.noticeVersion",
    );
  });

  it("gives identical bodies for the same post twice", async () => {
    const first = await (await post({ applicationId, inputs })).json();
    const second = await (await post({ applicationId, inputs })).json();
    expect(second).toEqual(first);
  });

  it("ignores a client fingerprint", async () => {
    const plain = await (await post({ applicationId, inputs })).json();
    const claimed = await (
      await post({ applicationId, fingerprint: "nope", inputs })
    ).json();
    expect(claimed).toEqual(plain);
  });

  it("gives another fingerprint when one input differs, even the job title", async () => {
    const base = await (await post({ applicationId, inputs })).json();
    const other = await (
      await post({ applicationId, inputs: { ...inputs, jobTitle: "Annen" } })
    ).json();
    expect(other.data.fingerprint).not.toBe(base.data.fingerprint);
    expect(other.data.result.score).toBe(base.data.result.score);
  });

  it("gives score 0 and all Missing for a CV with no Keywords", async () => {
    const cvText = "Lang tekst uten noe relevant. ".repeat(10);
    const body = await (
      await post({ applicationId, inputs: { ...inputs, cvText } })
    ).json();
    expect(body.data.result.score).toBe(0);
    expect(body.data.result.matched).toEqual([]);
    expect(body.data.result.missing).toHaveLength(body.data.result.totalCount);
  });

  it("rejects an ad of 200 characters with under 3 Keywords as inputs.jobAd", async () => {
    const jobAd = "Vi trenger en blid person. ".repeat(10);
    expect(jobAd.length).toBeGreaterThanOrEqual(200);
    await invalid(
      await post({ applicationId, inputs: { ...inputs, jobAd } }),
      "inputs.jobAd",
    );
  });

  it("rejects a CV under 200 characters as inputs.cvText", async () => {
    await invalid(
      await post({ applicationId, inputs: { ...inputs, cvText: "kort" } }),
      "inputs.cvText",
    );
  });

  it("rejects a bad applicationId as applicationId", async () => {
    await invalid(
      await post({ applicationId: "not-a-uuid", inputs }),
      "applicationId",
    );
  });

  it("rejects a body that is not JSON, with no field", async () => {
    await invalid(await post("not json", true));
  });
});

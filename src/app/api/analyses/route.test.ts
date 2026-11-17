import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalise } from "@/modules/keywords/core";
import { answerKeySchema } from "@/shared/core/answer-key";
import { POST } from "./route";

const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const key = answerKeySchema.parse(
  JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")),
);
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

describe("FR-4, FR-7 POST /api/analyses", () => {
  it("scores the Example pair as the Answer key says, without a network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await post({ applicationId, inputs });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    const { result, fingerprint } = body.data;
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result.score).toBe(key.score);
    expect(
      lower(result.matched.map((k: { term: string }) => k.term)).sort(),
    ).toEqual(lower(key.keywords.matched).sort());
    expect(
      lower(result.missing.map((k: { term: string }) => k.term)).sort(),
    ).toEqual(lower(key.keywords.missing).sort());
    expect(result).not.toHaveProperty("verdict");
    expect(fetchSpy).not.toHaveBeenCalled();
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

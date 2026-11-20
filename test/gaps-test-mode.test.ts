import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyseInputs } from "@/modules/application";
import { loadVocabulary } from "@/shared/server/data-files";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

// Tests set the flag on explicitly, so they do not depend on its default.
vi.mock("@/shared/server/config", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/shared/server/config")>();
  return {
    ...actual,
    getConfig: () => {
      const config = actual.getConfig();
      return { ...config, features: { ...config.features, gaps: true } };
    },
  };
});

// The real `runAi` in Test mode with the real cached adapter: the answer comes
// from `data/fixtures/*/cached/gaps.json`.
vi.mock("@/modules/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/ai")>();
  const { createCachedAdapter } = await import(
    "@/modules/ai/server/adapters/cached"
  );
  const adapter = createCachedAdapter();
  return {
    ...actual,
    runAi: (request: Parameters<typeof actual.runAi>[0], ctx: never) =>
      actual.runAi(request, ctx, { testMode: true, adapter }),
  };
});

import { POST } from "@/app/api/analyses/[id]/gaps/route";

const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const inputs = {
  cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${dir}/ad.txt`, "utf8"),
  jobTitle: meta.jobTitle,
  employer: meta.employer,
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

type RouteGap = {
  keyword: string;
  kind: string;
  explanation: { key?: string; text?: string };
};

async function request(options?: Parameters<typeof analyseInputs>[2]) {
  const analysed = await analyseInputs(inputs, await loadVocabulary(), options);
  if (!analysed.ok) throw new Error("fixture must analyse");
  const response = await POST(
    new Request(`http://localhost/api/analyses/${applicationId}/gaps`, {
      method: "POST",
      body: JSON.stringify({
        applicationId,
        fingerprint: analysed.value.fingerprint,
        inputs,
        consent: null,
      }),
    }),
    { params: Promise.resolve({ id: applicationId }) },
  );
  return {
    json: await response.json(),
    missing: analysed.value.result.missing.map(({ term }) => term),
  };
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

describe("FR-27 the Gaps route in Test mode on the Example pair", () => {
  it("answers from the Cached Gaps, one Gap per Missing keyword", async () => {
    const { json, missing } = await request();
    expect(json.ok).toBe(true);
    expect(json.data.meta.source).toBe("cached");
    const gaps: RouteGap[] = json.data.gaps;
    expect(gaps.map((gap) => gap.keyword)).toEqual(missing);
    const kinds = Object.fromEntries(gaps.map((g) => [g.keyword, g.kind]));
    expect(kinds).toMatchObject({
      "pull requests": "rewordable",
      testing: "rewordable",
      "responsive nettsider": "rewordable",
      TypeScript: "real",
    });
  });

  // Known mismatch, a hand-off to Stories 4.4 and 4.6: the Cached Gaps were
  // recorded for the Answer key's Missing keywords, and the app's default
  // flow (the saved AI Keyword list, Test mode) asks about other words. The
  // structure step gives each of those the template Real gap. This expected
  // failure turns into a failing test the day the recordings and the Missing
  // list agree, so the note can be removed.
  it.fails("gives no template Real gap when phase 1 uses the saved Keyword list", async () => {
    const { json } = await request({
      ai: { ctx: { studentId: null, consent: null } },
    });
    const gaps: RouteGap[] = json.data.gaps;
    expect(gaps.filter((gap) => gap.explanation.key !== undefined)).toEqual([]);
  });
});

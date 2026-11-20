import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyseInputs } from "@/modules/application";
import { loadVocabulary } from "@/shared/server/data-files";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

// The check is code only: if it ever reached `runAi` this mock would show it.
vi.mock("@/modules/ai", () => ({ runAi: vi.fn() }));

import { runAi } from "@/modules/ai";
import { POST } from "./route";

const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const inputs = {
  cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${dir}/ad.txt`, "utf8"),
  jobTitle: meta.jobTitle,
  employer: meta.employer,
};
const planted = (
  JSON.parse(
    readFileSync("data/fixtures/_planted/letter-flags.json", "utf8"),
  ) as { data: { text: string } }
).data.text;
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

async function body(overrides: Record<string, unknown> = {}) {
  const analysed = await analyseInputs(inputs, await loadVocabulary());
  if (!analysed.ok) throw new Error("fixture must analyse");
  return {
    applicationId,
    fingerprint: analysed.value.fingerprint,
    inputs,
    letter: { text: planted, tone: "Formell", rev: 2 },
    gaps: null,
    letterRev: 2,
    gapsRev: 0,
    ...overrides,
  };
}

function post(payload: unknown, id = applicationId, raw = false) {
  return POST(
    new Request(`http://localhost/api/analyses/${id}/letter-check`, {
      method: "POST",
      body: raw ? (payload as string) : JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function failure(response: Response, status: number, error: object) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ ok: false, error });
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.mocked(runAi).mockClear();
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FR-11 POST /api/analyses/[id]/letter-check", () => {
  it("returns the flags of the planted Letter with the revs, and makes no AI or network request", async () => {
    const response = await post(await body());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.letterRev).toBe(2);
    expect(json.data.gapsRev).toBe(0);
    expect(
      json.data.flags.map((flag: { kind: string; term: string }) => [
        flag.kind,
        flag.term,
      ]),
    ).toEqual([
      ["UNSUPPORTED_CLAIM", "TypeScript"],
      ["UPGRADE_WORD", "ledet"],
    ]);
    expect(json.data.flags[0].spans).toHaveLength(2);
    expect(runAi).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns no flags for a clean Letter", async () => {
    const letter = {
      text: "Hei.\n\nMed hilsen\n{{SIGNATUR}}",
      tone: "Formell",
      rev: 1,
    };
    const json = await (
      await post(await body({ letter, letterRev: 1 }))
    ).json();
    expect(json.data).toEqual({ flags: [], letterRev: 1, gapsRev: 0 });
  });

  it("takes the Missing keywords from its own analysis, not from the client", async () => {
    const json = await (
      await post(await body({ missing: [], matched: ["x"], flags: [] }))
    ).json();
    expect(json.data.flags).toHaveLength(2);
  });

  it("answers 409 ANALYSIS_STALE for another fingerprint", async () => {
    await failure(await post(await body({ fingerprint: "old" })), 409, {
      code: "ANALYSIS_STALE",
      retryable: false,
    });
  });

  it("answers 409 when an input changed after the fingerprint was made", async () => {
    await failure(
      await post(await body({ inputs: { ...inputs, jobTitle: "Annen" } })),
      409,
      { code: "ANALYSIS_STALE", retryable: false },
    );
  });

  it("answers 400 with the field letterRev when letter.rev differs", async () => {
    await failure(await post(await body({ letterRev: 3 })), 400, {
      code: "INVALID_INPUT",
      field: "letterRev",
      retryable: false,
    });
  });

  it("answers 400 for a Letter text above 20 000 characters", async () => {
    const letter = { text: "x".repeat(20_001), tone: "Formell", rev: 2 };
    await failure(await post(await body({ letter })), 400, {
      code: "INVALID_INPUT",
      field: "letter.text",
      retryable: false,
    });
  });

  it("answers 400 for gaps that are not null", async () => {
    await failure(await post(await body({ gaps: { real: [] } })), 400, {
      code: "INVALID_INPUT",
      field: "gaps",
      retryable: false,
    });
  });

  it("answers 400 for an [id] that is not the applicationId", async () => {
    await failure(
      await post(await body(), "11111111-2222-4333-8444-555555555555"),
      400,
      { code: "INVALID_INPUT", field: "applicationId", retryable: false },
    );
  });

  it("answers 400 for a short ad as inputs.jobAd", async () => {
    const jobAd = "Vi trenger en blid person. ".repeat(10);
    await failure(
      await post({ ...(await body()), inputs: { ...inputs, jobAd } }),
      400,
      { code: "INVALID_INPUT", field: "inputs.jobAd", retryable: false },
    );
  });

  it("answers 400 for a body that is not JSON", async () => {
    await failure(await post("not json", applicationId, true), 400, {
      code: "INVALID_INPUT",
      retryable: false,
    });
  });
});

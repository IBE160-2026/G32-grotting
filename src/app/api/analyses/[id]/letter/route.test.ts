import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyseInputs } from "@/modules/application";
import { err } from "@/shared/core/result";
import { loadVocabulary } from "@/shared/server/data-files";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

// The real `runAi` with an adapter of our own and Test mode on, so no key, no
// database and no network is touched. A test may replace one call.
const adapterText = vi.hoisted(() => ({
  value: "Hei Nordic Digital.\n\nMed vennlig hilsen\nOla Nordmann",
}));
vi.mock("@/modules/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/ai")>();
  return {
    ...actual,
    runAi: vi.fn((request: Parameters<typeof actual.runAi>[0], ctx) =>
      actual.runAi(request, ctx, {
        testMode: true,
        adapter: {
          kind: "mock",
          provider: "mock",
          model: "mock-1",
          async generate() {
            return {
              output: { text: adapterText.value },
              usage: { inputTokens: 1, outputTokens: 1 },
            };
          },
        },
      }),
    ),
  };
});

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
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

async function fingerprintOf(value: typeof inputs) {
  const analysed = analyseInputs(value, await loadVocabulary());
  if (!analysed.ok) throw new Error("fixture must analyse");
  return analysed;
}

async function body(overrides: Record<string, unknown> = {}) {
  const analysed = await fingerprintOf(inputs);
  return {
    applicationId,
    fingerprint: analysed.value.fingerprint,
    inputs,
    tone: "Formell",
    consent: null,
    ...overrides,
  };
}

function post(payload: unknown, id = applicationId, raw = false) {
  return POST(
    new Request(`http://localhost/api/analyses/${id}/letter`, {
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
  adapterText.value = "Hei Nordic Digital.\n\nMed vennlig hilsen\nOla Nordmann";
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FR-9, FR-10 POST /api/analyses/[id]/letter", () => {
  it("returns the Letter with rev 1 after one runAi call and no network request", async () => {
    const response = await post(await body());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.letter).toEqual({
      text: "Hei Nordic Digital.\n\nMed vennlig hilsen\n{{SIGNATUR}}",
      tone: "Formell",
      rev: 1,
    });
    expect(json.data.meta).toMatchObject({
      source: "mock",
      promptVersion: "letter-1",
    });
    expect(runAi).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("counts rev from previousRev", async () => {
    const json = await (
      await post(await body({ previousRev: 3, tone: "Direkte" }))
    ).json();
    expect(json.data.letter).toMatchObject({ rev: 4, tone: "Direkte" });
  });

  it("removes a written name and a doubled token", async () => {
    adapterText.value =
      "Hei.\n\nHilsen\n{{SIGNATUR}}\nOla Nordmann\n{{SIGNATUR}}";
    const json = await (await post(await body())).json();
    const text: string = json.data.letter.text;
    expect(text).not.toContain("Ola Nordmann");
    expect(text.split("{{SIGNATUR}}")).toHaveLength(2);
    expect(text.endsWith("{{SIGNATUR}}")).toBe(true);
  });

  it("adds a sign-off when the answer has none", async () => {
    adapterText.value = "Hei.";
    const json = await (await post(await body())).json();
    expect(json.data.letter.text).toBe(
      "Hei.\n\nMed vennlig hilsen\n{{SIGNATUR}}",
    );
  });

  it("builds the prompt from the server's own Matched keywords and drops client fields", async () => {
    const analysed = await fingerprintOf(inputs);
    const matched = analysed.value.result.matched.map((k) => k.term);
    const missing = analysed.value.result.missing.map((k) => k.term);
    expect(matched.length).toBeGreaterThan(0);
    expect(missing.length).toBeGreaterThan(0);

    await post(
      await body({
        name: "Ola Nordmann",
        matched: ["klientens-ord"],
        score: 100,
      }),
    );
    const request = vi.mocked(runAi).mock.calls[0]?.[0];
    const prompt = request?.buildPrompt("CV") ?? "";
    expect(prompt).not.toContain("klientens-ord");
    expect(prompt).not.toContain("Ola Nordmann");
    const section =
      prompt.split("Matched keywords")[1]?.split("Rules:")[0] ?? "";
    const listed = section
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2));
    expect(listed).toEqual(matched.slice(0, 8));
    for (const term of missing) expect(listed).not.toContain(term);
    expect(request).toMatchObject({
      task: "letter",
      promptVersion: "letter-1",
      tone: "Formell",
    });
  });

  it("answers 409 ANALYSIS_STALE for another fingerprint, with no runAi call", async () => {
    await failure(await post(await body({ fingerprint: "old" })), 409, {
      code: "ANALYSIS_STALE",
      retryable: false,
    });
    expect(runAi).not.toHaveBeenCalled();
  });

  it("answers 409 when an input changed after the fingerprint was made", async () => {
    const stale = await body({ inputs: { ...inputs, jobTitle: "Annen" } });
    await failure(await post(stale), 409, {
      code: "ANALYSIS_STALE",
      retryable: false,
    });
    expect(runAi).not.toHaveBeenCalled();
  });

  it("answers 400 for an [id] that is not the applicationId, with no runAi call", async () => {
    await failure(
      await post(await body(), "11111111-2222-4333-8444-555555555555"),
      400,
      { code: "INVALID_INPUT", field: "applicationId", retryable: false },
    );
    expect(runAi).not.toHaveBeenCalled();
  });

  it("answers 400 for an unknown tone, with no runAi call", async () => {
    await failure(await post(await body({ tone: "Hoyrost" })), 400, {
      code: "INVALID_INPUT",
      field: "tone",
      retryable: false,
    });
    expect(runAi).not.toHaveBeenCalled();
  });

  it("passes consent and a null studentId to runAi", async () => {
    await post(await body({ consent: { noticeVersion: "x" } }));
    expect(vi.mocked(runAi).mock.calls[0]?.[1]).toEqual({
      studentId: null,
      consent: { noticeVersion: "x" },
    });
    vi.mocked(runAi).mockClear();
    await post(await body({ consent: null }));
    expect(vi.mocked(runAi).mock.calls[0]?.[1]).toEqual({
      studentId: null,
      consent: null,
    });
  });

  it("answers 400 for a previousRev above 1 000 000", async () => {
    await failure(await post(await body({ previousRev: 1_000_001 })), 400, {
      code: "INVALID_INPUT",
      field: "previousRev",
      retryable: false,
    });
    expect(runAi).not.toHaveBeenCalled();
  });

  it("answers 400 for a bad previousRev or a missing consent field", async () => {
    await failure(await post(await body({ previousRev: -1 })), 400, {
      code: "INVALID_INPUT",
      field: "previousRev",
      retryable: false,
    });
    const { consent: _consent, ...withoutConsent } = await body();
    await failure(await post(withoutConsent), 400, {
      code: "INVALID_INPUT",
      field: "consent",
      retryable: false,
    });
    expect(runAi).not.toHaveBeenCalled();
  });

  it("answers 400 for a short ad as inputs.jobAd, with no runAi call", async () => {
    const jobAd = "Vi trenger en blid person. ".repeat(10);
    await failure(
      await post({ ...(await body()), inputs: { ...inputs, jobAd } }),
      400,
      { code: "INVALID_INPUT", field: "inputs.jobAd", retryable: false },
    );
    expect(runAi).not.toHaveBeenCalled();
  });

  it("answers 400 for a body that is not JSON", async () => {
    await failure(await post("not json", applicationId, true), 400, {
      code: "INVALID_INPUT",
      retryable: false,
    });
    expect(runAi).not.toHaveBeenCalled();
  });

  it.each([
    ["DAILY_CAP_REACHED", false, 429],
    ["AI_NOTICE_REQUIRED", false, 403],
    ["AI_TIMEOUT", true, 502],
    ["AI_PROVIDER_ERROR", true, 502],
  ] as const)(
    "maps the %s failure to %i in the envelope",
    async (code, retryable, status) => {
      vi.mocked(runAi).mockResolvedValueOnce(err({ code, retryable }));
      await failure(await post(await body()), status, { code, retryable });
      expect(runAi).toHaveBeenCalledTimes(1);
    },
  );

  it("answers a blank AI answer as a retryable 502 without raw text", async () => {
    adapterText.value = "{{SIGNATUR}}";
    await failure(await post(await body()), 502, {
      code: "AI_PROVIDER_ERROR",
      retryable: true,
    });
  });
});

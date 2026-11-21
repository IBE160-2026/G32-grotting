import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyseInputs } from "@/modules/application";
import { loadVocabulary } from "@/shared/server/data-files";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

// Tests set the flag on explicitly, so they do not depend on its default.
const flags = vi.hoisted(() => ({ gaps: true, rewording: false }));
vi.mock("@/shared/server/config", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/shared/server/config")>();
  return {
    ...actual,
    getConfig: () => {
      const config = actual.getConfig();
      return {
        ...config,
        features: {
          ...config.features,
          gaps: flags.gaps,
          rewording: flags.rewording,
        },
      };
    },
  };
});

// The real `runAi` with an adapter of our own and Test mode on, so no key, no
// database and no network is touched. A test may replace the answer.
const answer = vi.hoisted(() => ({
  value: undefined as unknown,
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
              output: answer.value,
              usage: { inputTokens: 1, outputTokens: 1 },
            };
          },
        },
      }),
    ),
  };
});

import { runAi } from "@/modules/ai";
import { maxDuration, POST } from "./route";

const dir = "data/fixtures/example-nordic-digital";
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
const inputs = {
  cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
  jobAd: readFileSync(`${dir}/ad.txt`, "utf8"),
  jobTitle: meta.jobTitle,
  employer: meta.employer,
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

async function phaseOne() {
  const analysed = await analyseInputs(inputs, await loadVocabulary());
  if (!analysed.ok) throw new Error("fixture must analyse");
  return analysed.value;
}

async function body(overrides: Record<string, unknown> = {}) {
  return {
    applicationId,
    fingerprint: (await phaseOne()).fingerprint,
    inputs,
    consent: null,
    ...overrides,
  };
}

function post(payload: unknown, id = applicationId, raw = false) {
  return POST(
    new Request(`http://localhost/api/analyses/${id}/gaps`, {
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

// An answer for the server's own Missing list, with the order reversed.
async function reversedAnswer() {
  const terms = (await phaseOne()).result.missing.map(({ term }) => term);
  return terms
    .map((term) => ({
      keyword: term,
      kind: "real",
      explanation: `CV-en viser ikke «${term}».`,
      citation: null,
      suggestion: "Skriv dette",
    }))
    .reverse();
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  flags.gaps = true;
  flags.rewording = false;
  vi.mocked(runAi).mockClear();
  answer.value = { gaps: [] };
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FR-13, FR-14 POST /api/analyses/[id]/gaps", () => {
  it("sets maxDuration to 120", () => {
    expect(maxDuration).toBe(120);
  });

  it("returns one Gap per Missing keyword in Missing order after one runAi call and no network request", async () => {
    answer.value = { gaps: await reversedAnswer() };
    const response = await post(await body());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);

    const missing = (await phaseOne()).result.missing.map(({ term }) => term);
    expect(missing.length).toBeGreaterThan(1);
    expect(
      json.data.gaps.map((gap: { keyword: string }) => gap.keyword),
    ).toEqual(missing);
    expect(
      json.data.gaps.every(
        (gap: { suggestion: unknown }) => gap.suggestion === null,
      ),
    ).toBe(true);
    expect(json.data.meta).toMatchObject({
      source: "mock",
      promptVersion: "gaps-3",
    });
    expect(runAi).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("FR-16: with features.rewording on, asks for suggestions and returns one for each Rewordable gap and null for a Real gap", async () => {
    flags.rewording = true;
    const missing = (await phaseOne()).result.missing.map(({ term }) => term);
    const [first, ...rest] = missing;
    const citation = inputs.cvText
      .split("\n")
      .find((line) => line.trim() !== "");
    if (first === undefined || citation === undefined) throw new Error("setup");
    answer.value = {
      gaps: [
        {
          keyword: first,
          kind: "rewordable",
          explanation: "Linjen din dekker trolig dette.",
          citation: citation.trim(),
          suggestion: "  Et forslag.  ",
        },
        ...rest.map((term) => ({
          keyword: term,
          kind: "real",
          explanation: "CV-en viser ikke dette.",
          citation: null,
          suggestion: "Skal bli null.",
        })),
      ],
    };
    const response = await post(await body());
    const json = await response.json();
    expect(json.ok).toBe(true);
    const suggestions = json.data.gaps.map(
      (gap: { suggestion: unknown }) => gap.suggestion,
    );
    expect(suggestions).toEqual(["Et forslag.", ...rest.map(() => null)]);
    const prompt = vi.mocked(runAi).mock.calls[0]?.[0].buildPrompt("CV") ?? "";
    expect(prompt).toContain('"suggestion"');
  });

  it("FR-17: with features.rewording on, a suggestion naming another Missing keyword or an Upgrade word the CV lacks is null, the citation and explanation stay", async () => {
    flags.rewording = true;
    const missing = (await phaseOne()).result.missing.map(({ term }) => term);
    const [first, second, ...rest] = missing;
    const citation = inputs.cvText
      .split("\n")
      .find((line) => line.trim() !== "");
    if (first === undefined || second === undefined || citation === undefined) {
      throw new Error("setup");
    }
    expect(inputs.cvText.toLowerCase()).not.toContain("grunnla");
    const rewordable = (term: string, suggestion: string) => ({
      keyword: term,
      kind: "rewordable",
      explanation: "Linjen din dekker trolig dette.",
      citation: citation.trim(),
      suggestion,
    });
    answer.value = {
      gaps: [
        rewordable(first, `Brukte ${first} og ${second}.`),
        rewordable(second, `Grunnla gruppen for ${second}.`),
        ...rest.map((term) => ({
          keyword: term,
          kind: "real",
          explanation: "CV-en viser ikke dette.",
          citation: null,
          suggestion: null,
        })),
      ],
    };
    const json = await (await post(await body())).json();
    expect(json.ok).toBe(true);
    const [one, two] = json.data.gaps;
    for (const gap of [one, two]) {
      expect(gap.kind).toBe("rewordable");
      expect(gap.citation).toBe(citation.trim());
      expect(gap.explanation).toEqual({
        text: "Linjen din dekker trolig dette.",
      });
      expect(gap.suggestion).toBeNull();
    }
  });

  it("FR-17: the route hands the vocabulary to the check, so a Missing keyword named by an alias is found", async () => {
    flags.rewording = true;
    const vocabulary = await loadVocabulary();
    const missing = (await phaseOne()).result.missing.map(({ term }) => term);
    const named = missing.find(
      (term) => (vocabulary.aliases[term]?.length ?? 0) > 0,
    );
    const alias =
      named === undefined ? undefined : vocabulary.aliases[named]?.[0];
    const own = missing.find((term) => term !== named);
    const citation = inputs.cvText
      .split("\n")
      .find((line) => line.trim() !== "");
    if (own === undefined || alias === undefined || citation === undefined) {
      throw new Error("setup: the Example pair misses a keyword with an alias");
    }
    expect(alias.toLowerCase()).not.toContain(own.toLowerCase());
    answer.value = {
      gaps: [
        {
          keyword: own,
          kind: "rewordable",
          explanation: "Linjen din dekker trolig dette.",
          citation: citation.trim(),
          suggestion: `Brukte ${alias} i prosjektet.`,
        },
      ],
    };
    const json = await (await post(await body())).json();
    expect(json.ok).toBe(true);
    const gap = json.data.gaps.find(
      (candidate: { keyword: string }) => candidate.keyword === own,
    );
    expect(gap.kind).toBe("rewordable");
    expect(gap.suggestion).toBeNull();
  });

  it("FR-16: with features.rewording off, no suggestion is asked for and every suggestion is null", async () => {
    answer.value = { gaps: await reversedAnswer() };
    const response = await post(await body());
    const json = await response.json();
    expect(json.ok).toBe(true);
    // The answer carries a suggestion for every item; none passes.
    expect(
      json.data.gaps.every(
        (gap: { suggestion: unknown }) => gap.suggestion === null,
      ),
    ).toBe(true);
    const prompt = vi.mocked(runAi).mock.calls[0]?.[0].buildPrompt("CV") ?? "";
    expect(prompt).not.toContain('"suggestion"');
  });

  it("turns every Keyword into the template Real gap when the AI skipped them all", async () => {
    const json = await (await post(await body())).json();
    const missing = (await phaseOne()).result.missing.map(({ term }) => term);
    expect(json.data.gaps).toEqual(
      missing.map((keyword) => ({
        keyword,
        kind: "real",
        explanation: { key: "REAL_GAP", params: { keyword } },
        citation: null,
        suggestion: null,
      })),
    );
  });

  it("asks with the CV text, the Job ad and the server's own Missing keywords, and drops client fields", async () => {
    await post(
      await body({ missing: ["klientens-ord"], name: "Ola Nordmann" }),
    );
    const request = vi.mocked(runAi).mock.calls[0]?.[0];
    const prompt = request?.buildPrompt(inputs.cvText) ?? "";
    expect(request).toMatchObject({
      task: "gaps",
      promptVersion: "gaps-3",
      cvText: inputs.cvText,
      jobAd: inputs.jobAd,
    });
    // The Gaps lookup key is the CV and the ad alone (AD-15).
    expect(request?.jobTitle).toBeUndefined();
    expect(request?.employer).toBeUndefined();
    expect(request?.tone).toBeUndefined();
    expect(prompt).not.toContain("klientens-ord");
    expect(prompt).not.toContain("Ola Nordmann");
    const listed = (prompt.split("Missing keywords, in this order:\n")[1] ?? "")
      .split("\n\n")[0]
      ?.split("\n")
      .map((line) => line.slice(2));
    expect(listed).toEqual(
      (await phaseOne()).result.missing.map(({ term }) => term),
    );
  });

  it("answers 409 ANALYSIS_STALE for another fingerprint, with no runAi call", async () => {
    await failure(await post(await body({ fingerprint: "old" })), 409, {
      code: "ANALYSIS_STALE",
      retryable: false,
    });
    expect(runAi).not.toHaveBeenCalled();
  });

  it("answers 409 when an input changed after the fingerprint was made", async () => {
    const stale = await body({
      inputs: { ...inputs, cvText: `${inputs.cvText}\nKunne bruke Rust.` },
    });
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

  it("answers 400 for a short ad as inputs.jobAd, with no runAi call", async () => {
    const jobAd = "Vi trenger en blid person. ".repeat(10);
    await failure(
      await post({ ...(await body()), inputs: { ...inputs, jobAd } }),
      400,
      { code: "INVALID_INPUT", field: "inputs.jobAd", retryable: false },
    );
    expect(runAi).not.toHaveBeenCalled();
  });

  it("answers 400 for a body that is not JSON or lacks consent, with no runAi call", async () => {
    await failure(await post("{nei", applicationId, true), 400, {
      code: "INVALID_INPUT",
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

  it("answers 502 AI_PROVIDER_ERROR, retryable, when the answer has the wrong shape", async () => {
    answer.value = { nei: true };
    await failure(await post(await body()), 502, {
      code: "AI_PROVIDER_ERROR",
      retryable: true,
    });
  });

  it("answers an empty list and no meta, with no runAi call, when no Keyword is missing", async () => {
    // A CV that holds every Keyword of the ad: the ad's own text.
    const full = { ...inputs, cvText: `${inputs.jobAd}\n${inputs.cvText}` };
    const analysed = await analyseInputs(full, await loadVocabulary());
    if (!analysed.ok) throw new Error("must analyse");
    expect(analysed.value.result.missing).toEqual([]);
    const json = await (
      await post({
        applicationId,
        fingerprint: analysed.value.fingerprint,
        inputs: full,
        consent: null,
      })
    ).json();
    expect(json).toEqual({ ok: true, data: { gaps: [], meta: null } });
    expect(runAi).not.toHaveBeenCalled();
  });
});

describe("FR-13 features.gaps off", () => {
  it("answers 404 NOT_FOUND with no runAi call, whatever the body", async () => {
    flags.gaps = false;
    await failure(await post(await body()), 404, {
      code: "NOT_FOUND",
      retryable: false,
    });
    await failure(await post("{nei", applicationId, true), 404, {
      code: "NOT_FOUND",
      retryable: false,
    });
    await failure(await post(await body({ fingerprint: "old" })), 404, {
      code: "NOT_FOUND",
      retryable: false,
    });
    expect(runAi).not.toHaveBeenCalled();
  });
});

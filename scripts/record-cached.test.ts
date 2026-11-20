import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiResultMetaSchema } from "@/modules/ai/contracts";
import { stripContactDetails } from "@/modules/ai/core/strip-contact";
import { AiProviderError } from "@/modules/ai/server/adapters/live";
import { createMockAdapter } from "@/modules/ai/server/adapters/mock";
import { analyseInputs } from "@/modules/application";
import {
  PROMPT_VERSION as GAPS_PROMPT_VERSION,
  gapsPromptBuilder,
} from "@/modules/gaps/server/prompts/gaps";
import { PROMPT_VERSION as KEYWORDS_PROMPT_VERSION } from "@/modules/keywords/server/prompts/keywords";
import { PROMPT_VERSION } from "@/modules/letter/server/prompts/letter";
import { answerKeySchema } from "@/shared/core/answer-key";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { parseArgs, RecordUsageError, recordCached } from "./record-cached";

const EXAMPLE = "example-nordic-digital";
const NOW = new Date("2026-11-19T12:00:00.000Z");
const KEY = "SENTINEL-KEY-hemmelig";
const folders: string[] = [];

// A copy of the Example pair Fixture, so the real folder is never written.
function fixturesCopy(ids: readonly string[] = [EXAMPLE]): string {
  const root = mkdtempSync(join(tmpdir(), "record-cached-"));
  folders.push(root);
  for (const id of ids) {
    cpSync(`data/fixtures/${id}`, join(root, id), {
      recursive: true,
      filter: (source) => !source.includes("cached"),
    });
  }
  return root;
}

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

const letterText = "Hei Nordic Digital.\n\nJeg søker.\n\n{{SIGNATUR}}";

function setup(respond?: (prompt: string) => unknown) {
  const prompts: string[] = [];
  const adapter = createMockAdapter({
    respond: (args) => {
      prompts.push(args.prompt);
      return respond ? respond(args.prompt) : { text: letterText };
    },
  });
  return { adapter, prompts, fixturesDir: fixturesCopy() };
}

describe("FR-27 record-cached arguments", () => {
  it("takes a Fixture id and an optional Tone", () => {
    expect(parseArgs([EXAMPLE])).toEqual({
      fixtureId: EXAMPLE,
      tone: undefined,
      keywords: false,
      gaps: false,
    });
    expect(parseArgs([EXAMPLE, "--tone", "Direkte"])).toEqual({
      fixtureId: EXAMPLE,
      tone: "Direkte",
      keywords: false,
      gaps: false,
    });
  });

  it("FR-5b takes --keywords, but not together with --tone", () => {
    expect(parseArgs([EXAMPLE, "--keywords"])).toEqual({
      fixtureId: EXAMPLE,
      tone: undefined,
      keywords: true,
      gaps: false,
    });
    expect(() =>
      parseArgs([EXAMPLE, "--keywords", "--tone", "Direkte"]),
    ).toThrow(/cannot be combined/);
  });

  it("refuses no id, two ids, a bad Tone and an unknown flag", () => {
    expect(() => parseArgs([])).toThrow(RecordUsageError);
    expect(() => parseArgs(["a", "b"])).toThrow(RecordUsageError);
    expect(() => parseArgs([EXAMPLE, "--tone", "Kort"])).toThrow(
      /--tone takes one of/,
    );
    expect(() => parseArgs([EXAMPLE, "--live"])).toThrow(/Unknown argument/);
  });
});

describe("FR-27 recordCached", () => {
  it("writes one raw Cached Letter per Tone with its meta, and nothing else", async () => {
    const { adapter, fixturesDir } = setup();
    const files = await recordCached({
      args: {
        fixtureId: EXAMPLE,
        tone: undefined,
        keywords: false,
        gaps: false,
      },
      env: {},
      fixturesDir,
      now: NOW,
      adapter,
    });
    const cached = join(fixturesDir, EXAMPLE, "cached");
    expect(readdirSync(cached).sort()).toEqual([
      "letter-direkte.json",
      "letter-formell.json",
      "letter-personlig.json",
    ]);
    expect(
      files.map((file) => file.replace(/\\/g, "/").split("/").pop()),
    ).toEqual([
      "letter-formell.json",
      "letter-personlig.json",
      "letter-direkte.json",
    ]);
    const written = JSON.parse(
      readFileSync(join(cached, "letter-formell.json"), "utf8"),
    );
    // The raw answer: no normaliseLetter, no guard.
    expect(written.data).toEqual({ text: letterText });
    expect(written.meta).toEqual({
      source: "live",
      provider: "mock",
      model: "mock-1",
      promptVersion: PROMPT_VERSION,
      createdAt: "2026-11-19T12:00:00.000Z",
    });
    expect(aiResultMetaSchema.safeParse(written.meta).success).toBe(true);
    // Nothing else in the Fixture changed.
    expect(readdirSync(join(fixturesDir, EXAMPLE)).sort()).toEqual([
      "ad.txt",
      "answer-key.json",
      "cached",
      "cv.pdf",
      "cv.txt",
      "meta.json",
    ]);
  });

  it("keeps a raw answer that breaks a rule: it is the tests that judge it", async () => {
    const { adapter, fixturesDir } = setup(() => ({ text: "Kort." }));
    await recordCached({
      args: {
        fixtureId: EXAMPLE,
        tone: "Formell",
        keywords: false,
        gaps: false,
      },
      env: {},
      fixturesDir,
      now: NOW,
      adapter,
    });
    const written = JSON.parse(
      readFileSync(
        join(fixturesDir, EXAMPLE, "cached", "letter-formell.json"),
        "utf8",
      ),
    );
    expect(written.data).toEqual({ text: "Kort." });
  });

  it("makes the prompt of generateLetter: the Tone, the Matched keywords, no contact details", async () => {
    const { adapter, prompts, fixturesDir } = setup();
    await recordCached({
      args: {
        fixtureId: EXAMPLE,
        tone: undefined,
        keywords: false,
        gaps: false,
      },
      env: {},
      fixturesDir,
      now: NOW,
      adapter,
    });
    expect(prompts).toHaveLength(3);
    const vocabulary = vocabularySchema.parse(
      JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
    );
    const folder = `data/fixtures/${EXAMPLE}`;
    // The Letters were recorded with the code-only list.
    const analysed = await analyseInputs(
      {
        cvText: readFileSync(`${folder}/cv.txt`, "utf8"),
        jobAd: readFileSync(`${folder}/ad.txt`, "utf8"),
        jobTitle: "Junior frontendutvikler",
        employer: "Nordic Digital",
      },
      vocabulary,
      { keywordFallback: false },
    );
    if (!analysed.ok) throw new Error("expected ok");
    const matched = analysed.value.result.matched.map(({ term }) => term);
    expect(matched.length).toBeGreaterThan(0);
    for (const prompt of prompts) {
      expect(prompt).toContain(
        matched
          .slice(0, 8)
          .map((term) => `- ${term}`)
          .join("\n"),
      );
      expect(prompt).toContain("Nordic Digital");
      expect(prompt).not.toMatch(/\S+@\S+\.\S+/);
    }
    expect(prompts.map((prompt) => /Tone: (\w+)\./.exec(prompt)?.[1])).toEqual([
      "Formell",
      "Personlig",
      "Direkte",
    ]);
  });

  it("records one Tone when asked", async () => {
    const { adapter, prompts, fixturesDir } = setup();
    await recordCached({
      args: {
        fixtureId: EXAMPLE,
        tone: "Personlig",
        keywords: false,
        gaps: false,
      },
      env: {},
      fixturesDir,
      now: NOW,
      adapter,
    });
    expect(prompts).toHaveLength(1);
    expect(readdirSync(join(fixturesDir, EXAMPLE, "cached"))).toEqual([
      "letter-personlig.json",
    ]);
  });

  it("writes nothing for a Tone whose request fails, and keeps the earlier ones", async () => {
    const fixturesDir = fixturesCopy();
    let calls = 0;
    const adapter = createMockAdapter({
      respond: () => {
        if (++calls === 2) throw new Error("provider said SENTINEL-ERR");
        return { text: letterText };
      },
    });
    await expect(
      recordCached({
        args: {
          fixtureId: EXAMPLE,
          tone: undefined,
          keywords: false,
          gaps: false,
        },
        env: {},
        fixturesDir,
        now: NOW,
        adapter,
      }),
    ).rejects.toThrow();
    expect(readdirSync(join(fixturesDir, EXAMPLE, "cached"))).toEqual([
      "letter-formell.json",
    ]);
  });

  it("refuses an answer with no text and writes nothing", async () => {
    const { adapter, fixturesDir } = setup(() => ({ nope: 1 }));
    await expect(
      recordCached({
        args: {
          fixtureId: EXAMPLE,
          tone: undefined,
          keywords: false,
          gaps: false,
        },
        env: {},
        fixturesDir,
        now: NOW,
        adapter,
      }),
    ).rejects.toThrow("no text");
    expect(existsSync(join(fixturesDir, EXAMPLE, "cached"))).toBe(false);
  });
});

describe("FR-5b recordCached --keywords", () => {
  const keywordArgs = {
    fixtureId: EXAMPLE,
    tone: undefined,
    keywords: true,
    gaps: false,
  };
  const answer = { keywords: ["React", "TypeScript", "Git"] };

  it("makes one request with the Job ad and no CV, and writes the raw answer to keywords.json", async () => {
    const { adapter, prompts, fixturesDir } = setup(() => answer);
    const files = await recordCached({
      args: keywordArgs,
      env: {},
      fixturesDir,
      now: NOW,
      adapter,
    });
    expect(prompts).toHaveLength(1);
    const folder = `data/fixtures/${EXAMPLE}`;
    expect(prompts[0]).toContain(
      readFileSync(`${folder}/ad.txt`, "utf8").trim().slice(0, 60),
    );
    // The CV never goes into the Keyword request (FR-26).
    const cvLines = readFileSync(`${folder}/cv.txt`, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 40);
    expect(cvLines.length).toBeGreaterThan(0);
    for (const line of cvLines) expect(prompts[0]).not.toContain(line.trim());
    expect(
      files.map((file) => file.replace(/\\/g, "/").split("/").pop()),
    ).toEqual(["keywords.json"]);
    const written = JSON.parse(
      readFileSync(
        join(fixturesDir, EXAMPLE, "cached", "keywords.json"),
        "utf8",
      ),
    );
    expect(written.data).toEqual(answer);
    expect(written.meta).toEqual({
      source: "live",
      provider: "mock",
      model: "mock-1",
      promptVersion: KEYWORDS_PROMPT_VERSION,
      createdAt: "2026-11-19T12:00:00.000Z",
    });
    expect(aiResultMetaSchema.safeParse(written.meta).success).toBe(true);
    expect(readdirSync(join(fixturesDir, EXAMPLE, "cached"))).toEqual([
      "keywords.json",
    ]);
  });

  it("keeps a term the ad does not contain: the raw answer is judged later", async () => {
    const { adapter, fixturesDir } = setup(() => ({
      keywords: ["Kubernetes-som-ikke-står-i-annonsen"],
    }));
    await recordCached({ args: keywordArgs, env: {}, fixturesDir, adapter });
    const written = JSON.parse(
      readFileSync(
        join(fixturesDir, EXAMPLE, "cached", "keywords.json"),
        "utf8",
      ),
    );
    expect(written.data.keywords).toEqual([
      "Kubernetes-som-ikke-står-i-annonsen",
    ]);
  });

  it("refuses an answer with no keywords and writes nothing", async () => {
    const { adapter, fixturesDir } = setup(() => ({ nope: 1 }));
    await expect(
      recordCached({ args: keywordArgs, env: {}, fixturesDir, adapter }),
    ).rejects.toThrow("no keywords");
    expect(existsSync(join(fixturesDir, EXAMPLE, "cached"))).toBe(false);
  });

  it("refuses an empty list and writes nothing", async () => {
    const { adapter, fixturesDir } = setup(() => ({ keywords: [] }));
    await expect(
      recordCached({ args: keywordArgs, env: {}, fixturesDir, adapter }),
    ).rejects.toThrow("no keywords");
    expect(existsSync(join(fixturesDir, EXAMPLE, "cached"))).toBe(false);
  });

  it("is refused in a test run, like the Letters", async () => {
    const { adapter, fixturesDir } = setup(() => answer);
    await expect(
      recordCached({
        args: keywordArgs,
        env: { VITEST: "true" },
        fixturesDir,
        adapter,
      }),
    ).rejects.toThrow(/test run/);
  });
});

describe("FR-13 recordCached --gaps (Story 4.3)", () => {
  const gapsArgs = {
    fixtureId: EXAMPLE,
    tone: undefined,
    keywords: false,
    gaps: true,
  };
  const answer = {
    gaps: [
      { keyword: "TypeScript", kind: "real", explanation: "e", citation: null },
    ],
  };
  const FIXTURES = [
    EXAMPLE,
    "held-out-regnskap-kvale",
    "nursing-sarvurdering",
    "two-column-fjord-analytics",
  ];

  it("takes --gaps alone", () => {
    expect(parseArgs([EXAMPLE, "--gaps"])).toEqual(gapsArgs);
    expect(() => parseArgs([EXAMPLE, "--gaps", "--keywords"])).toThrow(
      /cannot be combined/,
    );
    expect(() => parseArgs([EXAMPLE, "--gaps", "--tone", "Direkte"])).toThrow(
      /cannot be combined/,
    );
  });

  it("makes exactly one request with no retry, and writes the raw answer to gaps.json with its meta", async () => {
    const generate = vi.fn();
    const { adapter, fixturesDir, prompts } = setup(() => answer);
    const spy = vi.spyOn(adapter, "generate").mockImplementation(async (a) => {
      generate(a.maxRetries);
      prompts.push(a.prompt);
      return {
        output: answer,
        usage: { inputTokens: null, outputTokens: null },
      };
    });
    const files = await recordCached({
      args: gapsArgs,
      env: {},
      fixturesDir,
      now: NOW,
      adapter,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(0);
    expect(
      files.map((file) => file.replace(/\\/g, "/").split("/").pop()),
    ).toEqual(["gaps.json"]);
    const written = JSON.parse(
      readFileSync(join(fixturesDir, EXAMPLE, "cached", "gaps.json"), "utf8"),
    );
    expect(written.data).toEqual(answer);
    expect(written.meta).toEqual({
      source: "live",
      provider: "mock",
      model: "mock-1",
      promptVersion: GAPS_PROMPT_VERSION,
      createdAt: "2026-11-19T12:00:00.000Z",
    });
    expect(aiResultMetaSchema.safeParse(written.meta).success).toBe(true);
    expect(readdirSync(join(fixturesDir, EXAMPLE, "cached"))).toEqual([
      "gaps.json",
    ]);
  });

  it.each(FIXTURES)(
    "%s: asks about exactly the Missing keywords of its Answer key, in order, with the stripped CV",
    async (id) => {
      const fixturesDir = fixturesCopy([id]);
      const prompts: string[] = [];
      const adapter = createMockAdapter({
        respond: (args) => {
          prompts.push(args.prompt);
          return answer;
        },
      });
      await recordCached({
        args: { ...gapsArgs, fixtureId: id },
        env: {},
        fixturesDir,
        now: NOW,
        adapter,
      });
      const folder = `data/fixtures/${id}`;
      const key = answerKeySchema.parse(
        JSON.parse(readFileSync(`${folder}/answer-key.json`, "utf8")),
      );
      expect(prompts).toHaveLength(1);
      const listed = prompts[0]
        ?.split("Missing keywords, in this order:\n")[1]
        ?.split("\n\n")[0]
        ?.split("\n")
        .map((line) => line.replace(/^- /, ""));
      // The Answer key's Missing keywords, in its order.
      expect(listed).toEqual(key.keywords.missing);
      // The prompt is the one `analyseGaps` builds.
      expect(prompts[0]).toBe(
        gapsPromptBuilder({
          jobAd: readFileSync(`${folder}/ad.txt`, "utf8"),
          missingTerms: listed ?? [],
        })(stripContactDetails(readFileSync(`${folder}/cv.txt`, "utf8"))),
      );
    },
  );

  it("writes nothing when the request fails, and does not try again", async () => {
    const fixturesDir = fixturesCopy();
    const generate = vi.fn(async () => {
      throw new AiProviderError("HTTP_500");
    });
    const adapter = {
      ...createMockAdapter({ respond: () => answer }),
      generate,
    };
    await expect(
      recordCached({ args: gapsArgs, env: {}, fixturesDir, adapter }),
    ).rejects.toBeInstanceOf(AiProviderError);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(existsSync(join(fixturesDir, EXAMPLE, "cached"))).toBe(false);
  });

  it("writes the adapter's output as it came back, malformed items included", async () => {
    const odd = {
      gaps: [
        {
          keyword: "TypeScript",
          kind: "real",
          explanation: null,
          citation: null,
        },
        { keyword: "REST-API", kind: 3 },
      ],
    };
    const { adapter, fixturesDir } = setup(() => odd);
    await recordCached({ args: gapsArgs, env: {}, fixturesDir, adapter });
    const written = JSON.parse(
      readFileSync(join(fixturesDir, EXAMPLE, "cached", "gaps.json"), "utf8"),
    );
    expect(written.data).toEqual(odd);
  });

  it("refuses an answer with no list and writes nothing", async () => {
    const { adapter, fixturesDir } = setup(() => ({ nope: 1 }));
    await expect(
      recordCached({ args: gapsArgs, env: {}, fixturesDir, adapter }),
    ).rejects.toThrow("no list of gaps");
    expect(existsSync(join(fixturesDir, EXAMPLE, "cached"))).toBe(false);
  });

  it("is refused in a test run", async () => {
    const { adapter, fixturesDir } = setup(() => answer);
    await expect(
      recordCached({
        args: gapsArgs,
        env: { VITEST: "true" },
        fixturesDir,
        adapter,
      }),
    ).rejects.toThrow(/test run/);
  });
});

describe("FR-27 recordCached refuses what it must", () => {
  const args = {
    fixtureId: EXAMPLE,
    tone: undefined,
    keywords: false,
    gaps: false,
  };

  it.each([
    ["VITEST", { VITEST: "true" }],
    ["E2E", { E2E: "1" }],
    ["TEST_MODE", { TEST_MODE: "true" }],
  ])("a test run (%s), even with a key", async (_name, env) => {
    const { adapter, fixturesDir } = setup();
    await expect(
      recordCached({
        args,
        env: {
          ...env,
          AI_PROVIDER: "openrouter",
          AI_MODEL: "m",
          AI_API_KEY: KEY,
        },
        fixturesDir,
        adapter,
      }),
    ).rejects.toThrow(/test run/);
    expect(existsSync(join(fixturesDir, EXAMPLE, "cached"))).toBe(false);
  });

  it("a missing key, naming the setting and no value", async () => {
    const fixturesDir = fixturesCopy();
    const error = await recordCached({
      args,
      env: { AI_PROVIDER: "openrouter", AI_MODEL: "some/model" },
      fixturesDir,
    }).catch((e: Error) => e);
    expect(error).toBeInstanceOf(RecordUsageError);
    expect((error as Error).message).toBe("Missing setting: AI_API_KEY");
    expect(existsSync(join(fixturesDir, EXAMPLE, "cached"))).toBe(false);
  });

  it("an empty key counts as missing", async () => {
    await expect(
      recordCached({
        args,
        env: { AI_PROVIDER: "openrouter", AI_MODEL: "m", AI_API_KEY: "" },
        fixturesDir: fixturesCopy(),
      }),
    ).rejects.toThrow("Missing setting: AI_API_KEY");
  });

  it.each(["../x", "_planted", "A/b", "a b", ""])(
    "the Fixture id «%s»",
    async (fixtureId) => {
      const { adapter, fixturesDir } = setup();
      await expect(
        recordCached({
          args: { fixtureId, tone: undefined, keywords: false, gaps: false },
          env: {},
          fixturesDir,
          adapter,
        }),
      ).rejects.toThrow(RecordUsageError);
    },
  );

  it("a Fixture that does not exist", async () => {
    const { adapter, fixturesDir } = setup();
    await expect(
      recordCached({
        args: {
          fixtureId: "no-such-fixture",
          tone: undefined,
          keywords: false,
          gaps: false,
        },
        env: {},
        fixturesDir,
        adapter,
      }),
    ).rejects.toThrow("No Fixture no-such-fixture");
  });

  it("never makes a network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { adapter, fixturesDir } = setup();
    await recordCached({ args, env: {}, fixturesDir, now: NOW, adapter });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

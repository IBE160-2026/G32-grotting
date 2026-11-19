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
import { createMockAdapter } from "@/modules/ai/server/adapters/mock";
import { analyseInputs } from "@/modules/application";
import { PROMPT_VERSION } from "@/modules/letter/server/prompts/letter";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { parseArgs, RecordUsageError, recordCached } from "./record-cached";

const EXAMPLE = "example-nordic-digital";
const NOW = new Date("2026-11-19T12:00:00.000Z");
const KEY = "SENTINEL-KEY-hemmelig";
const folders: string[] = [];

// A copy of the Example pair Fixture, so the real folder is never written.
function fixturesCopy(): string {
  const root = mkdtempSync(join(tmpdir(), "record-cached-"));
  folders.push(root);
  cpSync(`data/fixtures/${EXAMPLE}`, join(root, EXAMPLE), {
    recursive: true,
    filter: (source) => !source.includes("cached"),
  });
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
    });
    expect(parseArgs([EXAMPLE, "--tone", "Direkte"])).toEqual({
      fixtureId: EXAMPLE,
      tone: "Direkte",
    });
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
      args: { fixtureId: EXAMPLE, tone: undefined },
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
      args: { fixtureId: EXAMPLE, tone: "Formell" },
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
      args: { fixtureId: EXAMPLE, tone: undefined },
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
    const analysed = analyseInputs(
      {
        cvText: readFileSync(`${folder}/cv.txt`, "utf8"),
        jobAd: readFileSync(`${folder}/ad.txt`, "utf8"),
        jobTitle: "Junior frontendutvikler",
        employer: "Nordic Digital",
      },
      vocabulary,
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
      args: { fixtureId: EXAMPLE, tone: "Personlig" },
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
        args: { fixtureId: EXAMPLE, tone: undefined },
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
        args: { fixtureId: EXAMPLE, tone: undefined },
        env: {},
        fixturesDir,
        now: NOW,
        adapter,
      }),
    ).rejects.toThrow("no text");
    expect(existsSync(join(fixturesDir, EXAMPLE, "cached"))).toBe(false);
  });
});

describe("FR-27 recordCached refuses what it must", () => {
  const args = { fixtureId: EXAMPLE, tone: undefined };

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
          args: { fixtureId, tone: undefined },
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
        args: { fixtureId: "no-such-fixture", tone: undefined },
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

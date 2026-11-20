import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractKeywords } from "@/modules/keywords/core";
import { osloDay } from "@/shared/core/time";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { getConfig } from "@/shared/server/config";
import { contentHash } from "@/shared/server/content-hash";
import { getDb } from "@/shared/server/db";
import { log } from "@/shared/server/log";
import { type ResolveOptions, resolveKeywords } from "./keyword-source";
import { MAX_PROPOSED } from "./prompts/keywords";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));
// Real behaviour by default; a test makes one call fail.
vi.mock("@/shared/server/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/server/db")>();
  return { ...actual, getDb: vi.fn(actual.getDb) };
});

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const ad = readFileSync("data/fixtures/example-nordic-digital/ad.txt", "utf8");
// A Cached-style answer with two Keywords the ad does not contain.
const planted = JSON.parse(
  readFileSync("data/fixtures/_planted/keywords-unsupported.json", "utf8"),
) as { data: { keywords: string[] } };

// A mock adapter of our own: a slice reaches `ai` only through its index.
type Adapter = NonNullable<
  NonNullable<NonNullable<ResolveOptions["ai"]>["run"]>["adapter"]
>;
function createMockAdapter(options: {
  respond?: (args: { prompt: string }) => unknown;
  error?: Error;
}): Adapter {
  return {
    kind: "mock",
    provider: "mock",
    model: "mock-1",
    async generate(args) {
      if (options.error) throw options.error;
      const output = options.respond ? options.respond(args) : { mock: true };
      return { output, usage: { inputTokens: null, outputTokens: null } };
    },
  };
}

const consent = () => ({ noticeVersion: getConfig().aiNotice.version });
const ctx = (accepted = true) => ({
  studentId: null,
  consent: accepted ? consent() : null,
});

// A live-mode run with a mock provider: the notice and the cap are checked, and
// no request leaves the process.
function live(
  respond: (prompt: string) => unknown,
  options: { accepted?: boolean } = {},
) {
  const prompts: string[] = [];
  const adapter = createMockAdapter({
    respond: (args) => {
      prompts.push(args.prompt);
      return respond(args.prompt);
    },
  });
  return {
    prompts,
    ai: { ctx: ctx(options.accepted), run: { adapter, testMode: false } },
  };
}

type Row = { content_hash: string; keywords: string[]; provider: string };
async function rows(): Promise<Row[]> {
  const result = await (await getDb()).execute(
    sql`select content_hash, keywords, provider from keyword_lists`,
  );
  return (Array.isArray(result) ? result : result.rows) as unknown as Row[];
}

type Resolved = Awaited<ReturnType<typeof resolveKeywords>>;
const termsOf = (resolved: Resolved) => {
  if (!resolved.ok) throw new Error(resolved.error);
  return resolved.value.keywords.map(({ term }) => term);
};

beforeEach(async () => {
  const db = await getDb();
  await db.execute(sql`delete from keyword_lists`);
  await db.execute(sql`delete from ai_usage`);
});

describe("AD-5 resolveKeywords with the fallback off", () => {
  it("gives the extracted Keywords with the source code and asks no AI", async () => {
    const { ai, prompts } = live(() => planted.data);
    const resolved = await resolveKeywords(ad, {
      vocabulary,
      ai,
      keywordFallback: false,
    });
    const extracted = extractKeywords(ad, vocabulary);
    if (!resolved.ok || !extracted.ok) throw new Error("expected Keywords");
    expect(resolved.value.keywordSource).toBe("code");
    expect(resolved.value.keywords).toEqual(extracted.value);
    expect(prompts).toHaveLength(0);
    expect(await rows()).toEqual([]);
  });

  it("gives TOO_FEW_KEYWORDS for an ad with under 3 Keywords", async () => {
    const resolved = await resolveKeywords(
      "Vi trenger en blid person. ".repeat(10),
      { vocabulary, keywordFallback: false },
    );
    expect(resolved).toEqual({ ok: false, error: "TOO_FEW_KEYWORDS" });
  });
});

describe("FR-5b a new ad, notice accepted, outside Test mode, under the cap", () => {
  it("makes one request, keeps only terms found in the ad, and saves the list under contentHash(canon(ad))", async () => {
    const { ai, prompts } = live(() => planted.data);
    const resolved = await resolveKeywords(ad, { vocabulary, ai });
    if (!resolved.ok) throw new Error(resolved.error);
    expect(prompts).toHaveLength(1);
    expect(resolved.value.keywordSource).toBe("saved");
    // Kubernetes and Terraform are not in the ad: dropped.
    expect(termsOf(resolved)).toEqual([
      "React",
      "TypeScript",
      "Git",
      "universell utforming",
      "Figma",
    ]);
    expect(await rows()).toEqual([
      {
        content_hash: contentHash(ad),
        keywords: termsOf(resolved),
        provider: "mock",
      },
    ]);
  });

  it("sends the Job ad and never the CV", async () => {
    const { ai, prompts } = live(() => planted.data);
    await resolveKeywords(ad, { vocabulary, ai });
    expect(prompts[0]).toContain(ad.trim().slice(0, 80));
    expect(prompts[0]).not.toContain("<cv>");
  });

  it("gives the same saved list on a second run, with no second request", async () => {
    const first = live(() => planted.data);
    const second = live(() => ({ keywords: ["noe", "helt", "annet"] }));
    const one = await resolveKeywords(ad, { vocabulary, ai: first.ai });
    const two = await resolveKeywords(ad, { vocabulary, ai: second.ai });
    expect(two).toEqual(one);
    expect(second.prompts).toHaveLength(0);
    expect(await rows()).toHaveLength(1);
  });

  it("reads the saved list without any AI, as phase 2 does", async () => {
    const { ai } = live(() => planted.data);
    const one = await resolveKeywords(ad, { vocabulary, ai });
    expect(await resolveKeywords(ad, { vocabulary })).toEqual(one);
  });

  it("finds the saved list for an ad that differs only in whitespace", async () => {
    const { ai } = live(() => planted.data);
    await resolveKeywords(ad, { vocabulary, ai });
    const spaced = await resolveKeywords(ad.replace(/ /g, "  "), {
      vocabulary,
    });
    if (!spaced.ok) throw new Error(spaced.error);
    expect(spaced.value.keywordSource).toBe("saved");
  });

  it("rescues an ad the vocabulary finds under 3 Keywords in", async () => {
    const odd =
      "Vi søker en regnskapsmedarbeider som kan Altinn, mva-oppgjør og lønnskjøring.";
    expect(extractKeywords(odd, vocabulary).ok).toBe(false);
    const { ai } = live(() => ({
      keywords: ["Altinn", "mva-oppgjør", "lønnskjøring", "Bitcoin"],
    }));
    const resolved = await resolveKeywords(odd, { vocabulary, ai });
    expect(termsOf(resolved)).toEqual([
      "Altinn",
      "mva-oppgjør",
      "lønnskjøring",
    ]);
  });

  it("reads at most MAX_PROPOSED terms of an answer", async () => {
    const many = Array.from({ length: MAX_PROPOSED + 5 }, (_, i) => `Ord${i}`);
    const { ai } = live(() => ({ keywords: [...many, "React", "Git", "CSS"] }));
    const resolved = await resolveKeywords(ad, { vocabulary, ai });
    // React, Git and CSS come after the cap, so they are not read: code is used.
    if (!resolved.ok) throw new Error(resolved.error);
    expect(resolved.value.keywordSource).toBe("code-fallback");
  });

  it("uses one saved list when two requests race", async () => {
    const a = live(() => ({ keywords: ["React", "TypeScript", "Git"] }));
    const b = live(() => ({ keywords: ["HTML", "CSS", "Figma"] }));
    const [one, two] = await Promise.all([
      resolveKeywords(ad, { vocabulary, ai: a.ai }),
      resolveKeywords(ad, { vocabulary, ai: b.ai }),
    ]);
    expect(two).toEqual(one);
    expect(await rows()).toHaveLength(1);
  });
});

describe("FR-5b the code-only list, marked code-fallback", () => {
  async function expectCodeFallback(resolved: Resolved) {
    if (!resolved.ok) throw new Error(resolved.error);
    expect(resolved.value.keywordSource).toBe("code-fallback");
    const extracted = extractKeywords(ad, vocabulary);
    if (!extracted.ok) throw new Error("expected Keywords");
    expect(resolved.value.keywords).toEqual(extracted.value);
    expect(await rows()).toEqual([]);
  }

  it("when the notice is not accepted: no request is made", async () => {
    const { ai, prompts } = live(() => planted.data, { accepted: false });
    await expectCodeFallback(await resolveKeywords(ad, { vocabulary, ai }));
    expect(prompts).toHaveLength(0);
  });

  it("when the accepted notice is an older version: no request is made", async () => {
    const prompts: string[] = [];
    const adapter = createMockAdapter({
      respond: (args) => {
        prompts.push(args.prompt);
        return planted.data;
      },
    });
    await expectCodeFallback(
      await resolveKeywords(ad, {
        vocabulary,
        ai: {
          ctx: { studentId: null, consent: { noticeVersion: "notice-0:old" } },
          run: { adapter, testMode: false },
        },
      }),
    );
    expect(prompts).toHaveLength(0);
  });

  it("when no AI is asked and nothing is saved", async () => {
    await expectCodeFallback(await resolveKeywords(ad, { vocabulary }));
  });

  it("when the Daily cap is reached: no request is made", async () => {
    await (await getDb()).execute(
      sql`insert into ai_usage (scope, day, count) values ('installation', ${osloDay(new Date())}, 30)`,
    );
    const { ai, prompts } = live(() => planted.data);
    await expectCodeFallback(await resolveKeywords(ad, { vocabulary, ai }));
    expect(prompts).toHaveLength(0);
  });

  it("when the request fails", async () => {
    const adapter = createMockAdapter({ error: new Error("provider down") });
    await expectCodeFallback(
      await resolveKeywords(ad, {
        vocabulary,
        ai: { ctx: ctx(), run: { adapter, testMode: false } },
      }),
    );
  });

  it("when the answer does not fit the schema", async () => {
    const { ai } = live(() => ({ words: ["React"] }));
    await expectCodeFallback(await resolveKeywords(ad, { vocabulary, ai }));
  });

  it("when fewer than 3 proposed terms are found in the ad", async () => {
    const { ai } = live(() => ({
      keywords: ["React", "Kubernetes", "Terraform", "Docker"],
    }));
    await expectCodeFallback(await resolveKeywords(ad, { vocabulary, ai }));
  });

  it("gives TOO_FEW_KEYWORDS when the fallback list is also too short", async () => {
    const resolved = await resolveKeywords(
      "Vi trenger en blid person. ".repeat(10),
      { vocabulary },
    );
    expect(resolved).toEqual({ ok: false, error: "TOO_FEW_KEYWORDS" });
  });
});

describe("FR-5b a failing database never breaks the score", () => {
  it("uses code, marked code-fallback, and logs the error by name, when the saved list cannot be read", async () => {
    vi.mocked(getDb).mockRejectedValueOnce(new TypeError("down"));
    const { ai, prompts } = live(() => planted.data);
    const resolved = await resolveKeywords(ad, { vocabulary, ai });
    if (!resolved.ok) throw new Error(resolved.error);
    expect(resolved.value.keywordSource).toBe("code-fallback");
    expect(prompts).toHaveLength(0);
    expect(log).toHaveBeenCalledWith({
      kind: "error",
      code: "UNEXPECTED",
      errorName: "TypeError",
      route: "keywords/resolve",
    });
  });

  it("uses code, and saves nothing, when the list cannot be saved after the request", async () => {
    const real = await getDb();
    // Reads: the saved list, then the Daily cap (inside runAi), then the save.
    vi.mocked(getDb)
      .mockResolvedValueOnce(real)
      .mockResolvedValueOnce(real)
      .mockRejectedValueOnce(new Error("write failed"));
    const { ai, prompts } = live(() => planted.data);
    const resolved = await resolveKeywords(ad, { vocabulary, ai });
    if (!resolved.ok) throw new Error(resolved.error);
    expect(resolved.value.keywordSource).toBe("code-fallback");
    expect(prompts).toHaveLength(1);
    expect(await rows()).toEqual([]);
  });
});

describe("FR-5b a saved row the engine no longer finds a list in", () => {
  it("is replaced by the new proposal instead of being asked for again on every run", async () => {
    await (await getDb()).execute(
      sql`insert into keyword_lists (content_hash, keywords, prompt_version, provider, model)
          values (${contentHash(ad)}, ${JSON.stringify(["Kubernetes", "Terraform"])}::jsonb, 'keywords-0', 'old', 'old')`,
    );
    const { ai, prompts } = live(() => planted.data);
    const resolved = await resolveKeywords(ad, { vocabulary, ai });
    if (!resolved.ok) throw new Error(resolved.error);
    expect(resolved.value.keywordSource).toBe("saved");
    expect(prompts).toHaveLength(1);
    expect((await rows())[0]?.provider).toBe("mock");
    // The next run reads the replaced row and asks nothing.
    const again = live(() => planted.data);
    await resolveKeywords(ad, { vocabulary, ai: again.ai });
    expect(again.prompts).toHaveLength(0);
  });
});

describe("FR-5b, FR-27 Test mode answers from the Cached Keyword list", () => {
  const testMode = { ctx: ctx(false), run: { testMode: true } };

  it("gives the Example ad its Cached list as `saved`, with no notice, and saves it", async () => {
    const resolved = await resolveKeywords(ad, { vocabulary, ai: testMode });
    if (!resolved.ok) throw new Error(resolved.error);
    expect(resolved.value.keywordSource).toBe("saved");
    expect(resolved.value.keywords.length).toBeGreaterThanOrEqual(3);
    expect(await rows()).toHaveLength(1);
  });

  it("falls back to code for an ad that is not a Fixture", async () => {
    const other = `${ad}\n\nEt avsnitt som ikke finnes i noen Fixture.`;
    const resolved = await resolveKeywords(other, { vocabulary, ai: testMode });
    if (!resolved.ok) throw new Error(resolved.error);
    expect(resolved.value.keywordSource).toBe("code-fallback");
    expect(await rows()).toEqual([]);
  });
});

import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMockAdapter } from "@/modules/ai/server/adapters/mock";
import {
  BakeOffUsageError,
  folderName,
  loadFixtures,
  parseArgs,
  resolveContenders,
  runBakeOff,
} from "./bake-off";

const made: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bake-off-test-"));
  made.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(
    made.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

const noPrices = { dry: false, out: undefined, priceIn: {}, priceOut: {} };
const fullEnv = {
  BAKE_OFF_ANTHROPIC_KEY: "SENTINEL-KEY-a",
  BAKE_OFF_OPENAI_KEY: "SENTINEL-KEY-o",
  BAKE_OFF_OPENAI_MODEL: "gpt-test",
};

describe("PRD 8.2 Bake-off arguments", () => {
  it("reads --dry, --out and a price per contender id", () => {
    expect(
      parseArgs([
        "--dry",
        "--out",
        "x",
        "--price-in",
        "anthropic=3",
        "--price-out",
        "anthropic=15",
        "--price-in",
        "openai=2.5",
      ]),
    ).toEqual({
      dry: true,
      out: "x",
      priceIn: { anthropic: 3, openai: 2.5 },
      priceOut: { anthropic: 15 },
    });
  });

  it("reads a price for one OpenRouter model, splitting on the last =", () => {
    expect(
      parseArgs([
        "--price-in",
        "openrouter:anthropic/claude-sonnet-5.5=1.5",
        "--price-out",
        "openrouter:odd=name=6",
      ]),
    ).toMatchObject({
      priceIn: { "openrouter:anthropic/claude-sonnet-5.5": 1.5 },
      priceOut: { "openrouter:odd=name": 6 },
    });
  });

  it("refuses an unknown flag, a bad price and a missing folder", () => {
    expect(() => parseArgs(["--wat"])).toThrow(BakeOffUsageError);
    expect(() => parseArgs(["--price-in", "3"])).toThrow(/price-in/);
    expect(() => parseArgs(["--price-out", "foo=3"])).toThrow(/price-out/);
    expect(() => parseArgs(["--price-in", "openrouter=3"])).toThrow(/price-in/);
    expect(() => parseArgs(["--price-in", "openrouter:=3"])).toThrow(
      /price-in/,
    );
    expect(() => parseArgs(["--price-in", "openai=-1"])).toThrow(/price-in/);
    expect(() => parseArgs(["--out"])).toThrow(/--out/);
  });
});

describe("PRD 8.2 Bake-off settings", () => {
  it("names the settings when nothing is configured, and writes nothing", async () => {
    expect(() => resolveContenders(noPrices, {})).toThrow(
      /No contender configured.*BAKE_OFF_ANTHROPIC_KEY.*BAKE_OFF_OPENAI_KEY.*BAKE_OFF_OPENROUTER_KEY/,
    );
    const out = join(await tempDir(), "never");
    await expect(
      runBakeOff({ args: { ...noPrices, out }, env: {} }),
    ).rejects.toThrow(/No contender configured/);
    expect(existsSync(out)).toBe(false);
  });

  it("plans only the contenders that have a key", () => {
    expect(
      resolveContenders(noPrices, { BAKE_OFF_ANTHROPIC_KEY: "k" }).map(
        (c) => c.id,
      ),
    ).toEqual(["anthropic"]);
    expect(resolveContenders(noPrices, fullEnv).map((c) => c.id)).toEqual([
      "anthropic",
      "openai",
    ]);
    expect(
      resolveContenders(noPrices, {
        BAKE_OFF_OPENAI_KEY: "k",
        BAKE_OFF_OPENAI_MODEL: "gpt-test",
      }).map((c) => c.id),
    ).toEqual(["openai"]);
  });

  it("needs the OpenAI model when the OpenAI key is set", async () => {
    const env = { BAKE_OFF_OPENAI_KEY: "SENTINEL-KEY-o" };
    expect(() => resolveContenders(noPrices, env)).toThrow(
      "Missing setting: BAKE_OFF_OPENAI_MODEL",
    );
    expect(() =>
      resolveContenders(noPrices, { ...env, BAKE_OFF_OPENAI_MODEL: "" }),
    ).toThrow(/BAKE_OFF_OPENAI_MODEL$/);
    const out = join(await tempDir(), "never");
    await expect(
      runBakeOff({ args: { ...noPrices, out }, env }),
    ).rejects.toThrow(/BAKE_OFF_OPENAI_MODEL/);
    expect(existsSync(out)).toBe(false);
  });

  it("refuses a direct model without its key, joined with other missing settings, and writes nothing", async () => {
    expect(() =>
      resolveContenders(noPrices, {
        BAKE_OFF_OPENAI_KEY: "k",
        BAKE_OFF_OPENAI_MODEL: "gpt-test",
        BAKE_OFF_ANTHROPIC_MODEL: "claude-test",
      }),
    ).toThrow("Missing setting: BAKE_OFF_ANTHROPIC_KEY");
    expect(() =>
      resolveContenders(noPrices, {
        BAKE_OFF_ANTHROPIC_KEY: "k",
        BAKE_OFF_OPENAI_MODEL: "gpt-test",
      }),
    ).toThrow("Missing setting: BAKE_OFF_OPENAI_KEY");
    const env = {
      BAKE_OFF_ANTHROPIC_MODEL: "claude-test",
      BAKE_OFF_OPENAI_MODEL: "gpt-test",
      BAKE_OFF_OPENROUTER_MODELS: "a/x",
    };
    expect(() => resolveContenders(noPrices, env)).toThrow(
      "Missing setting: BAKE_OFF_ANTHROPIC_KEY, BAKE_OFF_OPENAI_KEY, BAKE_OFF_OPENROUTER_KEY",
    );
    const out = join(await tempDir(), "never");
    await expect(
      runBakeOff({ args: { ...noPrices, out }, env }),
    ).rejects.toThrow(/BAKE_OFF_ANTHROPIC_KEY/);
    expect(existsSync(out)).toBe(false);
  });

  it("lets a dry run ignore a model without its key", () => {
    expect(() =>
      resolveContenders(
        { ...noPrices, dry: true },
        { BAKE_OFF_OPENAI_MODEL: "gpt-test", BAKE_OFF_ANTHROPIC_MODEL: "c" },
      ),
    ).not.toThrow();
  });

  it("defaults the Anthropic model and has no built-in price", () => {
    const [anthropic, openai] = resolveContenders(noPrices, fullEnv);
    expect(anthropic).toMatchObject({
      id: "anthropic",
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      price: undefined,
    });
    expect(openai).toMatchObject({
      id: "openai",
      provider: "openai",
      model: "gpt-test",
    });
  });

  it("needs no key and no OpenAI model in a dry run", () => {
    expect(() =>
      resolveContenders({ ...noPrices, dry: true }, {}),
    ).not.toThrow();
  });
});

describe("PRD 8.2 Bake-off OpenRouter contenders", () => {
  const orEnv = {
    BAKE_OFF_OPENROUTER_KEY: "SENTINEL-KEY-r",
    BAKE_OFF_OPENROUTER_MODELS: "a/x,b/y",
  };

  it("plans one contender per model, all on the one key", () => {
    const contenders = resolveContenders(noPrices, orEnv);
    expect(contenders.map((c) => c.id)).toEqual([
      "openrouter:a/x",
      "openrouter:b/y",
    ]);
    expect(contenders).toMatchObject([
      { provider: "openrouter", model: "a/x", apiKey: "SENTINEL-KEY-r" },
      { provider: "openrouter", model: "b/y", apiKey: "SENTINEL-KEY-r" },
    ]);
  });

  it("mixes a direct contender with the OpenRouter models", () => {
    const contenders = resolveContenders(noPrices, {
      ...orEnv,
      BAKE_OFF_ANTHROPIC_KEY: "SENTINEL-KEY-a",
    });
    expect(contenders.map((c) => c.id)).toEqual([
      "anthropic",
      "openrouter:a/x",
      "openrouter:b/y",
    ]);
  });

  it("trims the list and drops empty items", () => {
    const contenders = resolveContenders(noPrices, {
      ...orEnv,
      BAKE_OFF_OPENROUTER_MODELS: " a/x , ,b/y,",
    });
    expect(contenders.map((c) => c.model)).toEqual(["a/x", "b/y"]);
  });

  it("applies a price to that contender only", () => {
    const contenders = resolveContenders(
      {
        ...noPrices,
        priceIn: { "openrouter:a/x": 2 },
        priceOut: { "openrouter:a/x": 8 },
      },
      orEnv,
    );
    expect(contenders[0]?.price).toEqual({ inPerMillion: 2, outPerMillion: 8 });
    expect(contenders[1]?.price).toBeUndefined();
  });

  it("refuses a price for a contender that is not planned", () => {
    const price = { "openrouter:c/z": 1 };
    expect(() =>
      resolveContenders({ ...noPrices, priceIn: price }, orEnv),
    ).toThrow(/openrouter:c\/z.*BAKE_OFF_OPENROUTER_MODELS/);
    expect(() =>
      resolveContenders({ ...noPrices, priceOut: price }, fullEnv),
    ).toThrow(/openrouter:c\/z.*BAKE_OFF_OPENROUTER_KEY/);
    expect(() =>
      resolveContenders(
        { ...noPrices, priceIn: { anthropic: 1 } },
        { BAKE_OFF_OPENROUTER_KEY: "k", BAKE_OFF_OPENROUTER_MODELS: "a/x" },
      ),
    ).toThrow(/anthropic.*BAKE_OFF_ANTHROPIC_KEY/);
    expect(() =>
      resolveContenders(
        { ...noPrices, dry: true, priceIn: { "openrouter:c/z": 1 } },
        {},
      ),
    ).toThrow(/openrouter:c\/z/);
  });

  it("names the models when the key is set without them, and writes nothing", async () => {
    const env = { ...fullEnv, BAKE_OFF_OPENROUTER_KEY: "SENTINEL-KEY-r" };
    expect(() => resolveContenders(noPrices, env)).toThrow(
      "Missing setting: BAKE_OFF_OPENROUTER_MODELS",
    );
    expect(() =>
      resolveContenders(noPrices, {
        ...env,
        BAKE_OFF_OPENROUTER_MODELS: " , ",
      }),
    ).toThrow(/BAKE_OFF_OPENROUTER_MODELS/);
    const out = join(await tempDir(), "never");
    await expect(
      runBakeOff({ args: { ...noPrices, out }, env }),
    ).rejects.toThrow(/BAKE_OFF_OPENROUTER_MODELS/);
    expect(existsSync(out)).toBe(false);
  });

  it("names the key when models are set without it, and writes nothing", async () => {
    const env = { ...fullEnv, BAKE_OFF_OPENROUTER_MODELS: "a/x" };
    expect(() => resolveContenders(noPrices, env)).toThrow(
      "Missing setting: BAKE_OFF_OPENROUTER_KEY",
    );
    const out = join(await tempDir(), "never");
    await expect(
      runBakeOff({ args: { ...noPrices, out }, env }),
    ).rejects.toThrow(/BAKE_OFF_OPENROUTER_KEY/);
    expect(existsSync(out)).toBe(false);
  });

  it("refuses the same model twice", () => {
    const env = { ...orEnv, BAKE_OFF_OPENROUTER_MODELS: "a/x, b/y ,a/x" };
    expect(() => resolveContenders(noPrices, env)).toThrow(BakeOffUsageError);
    expect(() => resolveContenders({ ...noPrices, dry: true }, env)).toThrow(
      /twice/,
    );
  });

  it("gives every contender a folder with no path separator", () => {
    expect(folderName("openrouter:a/x")).toBe("openrouter-a-x");
    expect(folderName("anthropic")).toBe("anthropic");
    const [first] = resolveContenders(noPrices, {
      ...orEnv,
      BAKE_OFF_OPENROUTER_MODELS: "anthropic/claude-sonnet-5.5",
    });
    expect(first?.folder).toBe("openrouter-anthropic-claude-sonnet-5.5");
    expect(first?.folder).not.toMatch(/[/\\:]/);
  });

  it("refuses two models that would share a folder", () => {
    expect(() =>
      resolveContenders(noPrices, {
        ...orEnv,
        BAKE_OFF_OPENROUTER_MODELS: "a/x,a-x",
      }),
    ).toThrow(/same folder/);
  });

  it("refuses two models whose folders differ only by case", () => {
    expect(() =>
      resolveContenders(noPrices, {
        ...orEnv,
        BAKE_OFF_OPENROUTER_MODELS: "a/X,a/x",
      }),
    ).toThrow(/same folder/);
  });

  it("plans anthropic, openai and one OpenRouter contender in a dry run", () => {
    expect(
      resolveContenders({ ...noPrices, dry: true }, {}).map((c) => c.id),
    ).toEqual(["anthropic", "openai", "openrouter:mock-1"]);
    expect(
      resolveContenders({ ...noPrices, dry: true }, orEnv).map((c) => c.id),
    ).toEqual(["anthropic", "openai", "openrouter:a/x", "openrouter:b/y"]);
  });

  it("asks two requests per Fixture and contender, each with the right key and model", async () => {
    const out = await tempDir();
    const seen: string[] = [];
    await runBakeOff({
      args: { dry: false, out, priceIn: {}, priceOut: {} },
      env: { ...fullEnv, ...orEnv },
      adapterFor: (contender) => {
        seen.push(
          `${contender.id}|${contender.provider}|${contender.model}|${contender.apiKey}`,
        );
        return createMockAdapter({
          respond: () => ({ text: "Hei", gaps: [] }),
        });
      },
    });
    // 4 Fixtures x 2 tasks x 4 contenders.
    expect(seen).toHaveLength(32);
    expect(seen).toContain("openrouter:a/x|openrouter|a/x|SENTINEL-KEY-r");
    expect(seen).toContain("openrouter:b/y|openrouter|b/y|SENTINEL-KEY-r");
    expect(seen).toContain("openai|openai|gpt-test|SENTINEL-KEY-o");
    expect(await readdir(join(out, "openrouter-a-x"))).not.toHaveLength(0);
    expect(await readdir(join(out, "openrouter-b-y"))).not.toHaveLength(0);
    const results = await readFile(join(out, "results.md"), "utf8");
    expect(results).toContain("| openrouter:a/x | a/x |");
    expect(results).toContain("openrouter-b-y/");
  });

  it("makes OpenRouter-only runs with no direct key", async () => {
    const out = await tempDir();
    const seen: string[] = [];
    await runBakeOff({
      args: { dry: false, out, priceIn: {}, priceOut: {} },
      env: orEnv,
      adapterFor: (contender) => {
        seen.push(contender.id);
        return createMockAdapter({
          respond: () => ({ text: "Hei", gaps: [] }),
        });
      },
    });
    expect(new Set(seen)).toEqual(
      new Set(["openrouter:a/x", "openrouter:b/y"]),
    );
    expect(seen).toHaveLength(16);
    expect(existsSync(join(out, "anthropic"))).toBe(false);
  });
});

describe("PRD 8.2 Bake-off never overwrites scored results", () => {
  it("refuses a live run into a folder that has a results.md, before any request", async () => {
    const root = await tempDir();
    const out = join(root, "out");
    await mkdir(out);
    await writeFile(join(out, "results.md"), "scored by hand");
    let requests = 0;
    await expect(
      runBakeOff({
        args: { dry: false, out, priceIn: {}, priceOut: {} },
        env: fullEnv,
        adapterFor: () => {
          requests++;
          return createMockAdapter();
        },
      }),
    ).rejects.toThrow(BakeOffUsageError);
    expect(requests).toBe(0);
    expect(await readFile(join(out, "results.md"), "utf8")).toBe(
      "scored by hand",
    );
    expect(await readdir(out)).toEqual(["results.md"]);
  });

  it("names the folder in the error", async () => {
    const out = await tempDir();
    await writeFile(join(out, "results.md"), "x");
    await expect(
      runBakeOff({
        args: { dry: false, out, priceIn: {}, priceOut: {} },
        env: fullEnv,
      }),
    ).rejects.toThrow(out);
  });

  it("lets a dry run write over its own folder", async () => {
    const out = await tempDir();
    await writeFile(join(out, "results.md"), "x");
    await runBakeOff({
      args: { dry: true, out, priceIn: {}, priceOut: {} },
      env: {},
    });
    expect(await readFile(join(out, "results.md"), "utf8")).toContain(
      "Bake-off results",
    );
  });
});

describe("PRD 8.2 Bake-off dry run", () => {
  it("writes every Fixture for all three contenders, with blank checklist cells", async () => {
    const out = await tempDir();
    const dir = await runBakeOff({
      args: { dry: true, out, priceIn: {}, priceOut: {} },
      env: {},
    });
    expect(dir).toBe(out);
    const fixtures = await loadFixtures(
      join(process.cwd(), "data", "fixtures"),
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(4);
    const results = await readFile(join(out, "results.md"), "utf8");
    for (const { id } of fixtures) {
      for (const folder of ["anthropic", "openai", "openrouter-mock-1"]) {
        expect(results).toContain(`${folder}/${id}.letter.txt`);
        expect(results).toContain(`${folder}/${id}.gap.json`);
        expect(await readdir(join(out, folder))).toContain(`${id}.gap.json`);
      }
    }
    expect(results).toMatch(/\| L1 \|[^|]+\| \|/);
    expect(results).toMatch(/\| R1 \|[^|]+\| \|/);
    expect(results).toContain("**Dry run:**");
  });

  it("defaults to the OS temp directory, never docs/", async () => {
    const dir = await runBakeOff({
      args: { dry: true, out: undefined, priceIn: {}, priceOut: {} },
      env: {},
    });
    made.push(dir);
    expect(dir.startsWith(tmpdir())).toBe(true);
    expect(existsSync(join(dir, "results.md"))).toBe(true);
  });
});

async function oneFixture(root: string): Promise<string> {
  const fixtures = join(root, "fixtures");
  const folder = join(fixtures, "fx-1");
  await mkdir(folder, { recursive: true });
  await writeFile(
    join(folder, "cv.txt"),
    "Erfaring som vikar.\nKontakt ola.nordmann@example.no eller +47 22 33 44 55.\n",
  );
  await writeFile(join(folder, "ad.txt"), "Vi søker en vikar.\n");
  await writeFile(
    join(folder, "meta.json"),
    JSON.stringify({ jobTitle: "Vikar", employer: "Firma AS" }),
  );
  // A folder with no ad is skipped, and so is a "_" folder.
  await mkdir(join(fixtures, "fx-2"));
  await writeFile(join(fixtures, "fx-2", "cv.txt"), "x");
  await mkdir(join(fixtures, "_planted"));
  return fixtures;
}

describe("PRD 8.2 Bake-off requests", () => {
  it("strips contact details from the CV and makes no retries", async () => {
    const root = await tempDir();
    const fixturesDir = await oneFixture(root);
    const prompts: string[] = [];
    const retries: number[] = [];
    await runBakeOff({
      args: { dry: true, out: join(root, "out"), priceIn: {}, priceOut: {} },
      env: {},
      fixturesDir,
      adapterFor: (_contender, task) =>
        createMockAdapter({
          respond: (args) => {
            prompts.push(args.prompt);
            retries.push(args.maxRetries);
            return task === "letter"
              ? { text: "Hei {{SIGNATUR}}" }
              : { gaps: [] };
          },
        }),
    });
    // One Letter and one Gap request per contender (three in a dry run), for the
    // one Fixture.
    expect(prompts).toHaveLength(6);
    expect(retries.every((n) => n === 0)).toBe(true);
    for (const prompt of prompts) {
      expect(prompt).toContain("Erfaring som vikar.");
      expect(prompt).not.toMatch(/example\.no|22 33 44 55/);
    }
  });

  it("records a failed request by its error code and carries on", async () => {
    const root = await tempDir();
    const fixturesDir = await oneFixture(root);
    const out = join(root, "out");
    const SECRET = "SENTINEL-ERR-hemmelig-prompt-tekst";
    await runBakeOff({
      args: { dry: true, out, priceIn: {}, priceOut: {} },
      env: {},
      fixturesDir,
      adapterFor: (contender, task) =>
        contender.id === "openai" && task === "letter"
          ? createMockAdapter({ error: new Error(SECRET) })
          : createMockAdapter({
              respond: () =>
                task === "letter" ? { text: "Hei" } : { gaps: [] },
            }),
    });
    const results = await readFile(join(out, "results.md"), "utf8");
    expect(results).toContain(
      "**Request failed** with error code `UNEXPECTED`",
    );
    expect(results).not.toContain(SECRET);
    // The other requests still ran.
    expect(results).toContain("openai/fx-1.gap.json");
    expect(results).toContain("anthropic/fx-1.letter.txt");
    expect(existsSync(join(out, "openai", "fx-1.letter.txt"))).toBe(false);
  });

  it("records an answer of the wrong shape as SCHEMA_MISMATCH", async () => {
    const root = await tempDir();
    const fixturesDir = await oneFixture(root);
    const out = join(root, "out");
    await runBakeOff({
      args: { dry: true, out, priceIn: {}, priceOut: {} },
      env: {},
      fixturesDir,
      adapterFor: () => createMockAdapter({ respond: () => ({ wrong: 1 }) }),
    });
    const results = await readFile(join(out, "results.md"), "utf8");
    expect(results).toContain("`SCHEMA_MISMATCH`");
  });

  it("prices a request when both prices are given", async () => {
    const root = await tempDir();
    const fixturesDir = await oneFixture(root);
    const out = join(root, "out");
    await runBakeOff({
      args: {
        dry: true,
        out,
        priceIn: { anthropic: 3 },
        priceOut: { anthropic: 15 },
      },
      env: {},
      fixturesDir,
      adapterFor: (_c, task) =>
        createMockAdapter({
          respond: () => (task === "letter" ? { text: "Hei" } : { gaps: [] }),
          usage: { inputTokens: 1_000_000, outputTokens: 100_000 },
        }),
    });
    const results = await readFile(join(out, "results.md"), "utf8");
    // 2 requests x (1M x 3 + 0.1M x 15) / 1M = 9 USD for the Application.
    expect(results).toContain(
      "| fx-1 | anthropic | 2000000 | 200000 | $9.0000 |",
    );
    expect(results).toContain("| fx-1 | openai | 2000000 | 200000 | n/a |");
  });
});

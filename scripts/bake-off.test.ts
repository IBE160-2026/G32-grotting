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
  it("reads --dry, --out and a price per contender", () => {
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

  it("refuses an unknown flag, a bad price and a missing folder", () => {
    expect(() => parseArgs(["--wat"])).toThrow(BakeOffUsageError);
    expect(() => parseArgs(["--price-in", "3"])).toThrow(/price-in/);
    expect(() => parseArgs(["--price-out", "foo=3"])).toThrow(/price-out/);
    expect(() => parseArgs(["--out"])).toThrow(/--out/);
  });
});

describe("PRD 8.2 Bake-off settings", () => {
  it("names every missing setting and never a value", () => {
    expect(() => resolveContenders(noPrices, {})).toThrow(
      "Missing setting: BAKE_OFF_ANTHROPIC_KEY, BAKE_OFF_OPENAI_KEY, BAKE_OFF_OPENAI_MODEL",
    );
    expect(() =>
      resolveContenders(noPrices, { ...fullEnv, BAKE_OFF_OPENAI_MODEL: "" }),
    ).toThrow(/BAKE_OFF_OPENAI_MODEL$/);
  });

  it("defaults the Anthropic model and has no built-in price", () => {
    const [anthropic, openai] = resolveContenders(noPrices, fullEnv);
    expect(anthropic).toMatchObject({
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      price: undefined,
    });
    expect(openai).toMatchObject({ provider: "openai", model: "gpt-test" });
  });

  it("needs no key and no OpenAI model in a dry run", () => {
    expect(() =>
      resolveContenders({ ...noPrices, dry: true }, {}),
    ).not.toThrow();
  });

  it("writes nothing when a setting is missing", async () => {
    const out = join(await tempDir(), "never");
    await expect(
      runBakeOff({ args: { ...noPrices, out }, env: {} }),
    ).rejects.toThrow(/BAKE_OFF_OPENAI_MODEL/);
    expect(existsSync(out)).toBe(false);
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
  it("writes every Fixture for both contenders, with blank checklist cells", async () => {
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
      for (const provider of ["anthropic", "openai"]) {
        expect(results).toContain(`${provider}/${id}.letter.txt`);
        expect(results).toContain(`${provider}/${id}.gap.json`);
        expect(await readdir(join(out, provider))).toContain(`${id}.gap.json`);
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
    // One Letter and one Gap request per contender, for the one Fixture.
    expect(prompts).toHaveLength(4);
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
        contender.provider === "openai" && task === "letter"
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

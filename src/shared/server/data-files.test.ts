import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VOCABULARY_VERSION_FORMAT } from "@/shared/core/vocabulary";
import { loadExamplePair, loadFixtures, loadVocabulary } from "./data-files";

const folders: string[] = [];

// A working directory holding data/vocabulary/nb.json with the given content.
async function workingDirectoryWith(content: string | undefined) {
  const root = await mkdtemp(join(tmpdir(), "vocabulary-"));
  folders.push(root);
  if (content !== undefined) {
    await mkdir(join(root, "data", "vocabulary"), { recursive: true });
    await writeFile(join(root, "data", "vocabulary", "nb.json"), content);
  }
  vi.spyOn(process, "cwd").mockReturnValue(root);
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    folders.splice(0).map((folder) => rm(folder, { recursive: true })),
  );
});

describe("FR-5 loadVocabulary (AD-15)", () => {
  it("reads and validates the real vocabulary file", async () => {
    const vocabulary = await loadVocabulary();
    expect(vocabulary.vocabularyVersion).toMatch(VOCABULARY_VERSION_FORMAT);
    expect(vocabulary.terms.length).toBeGreaterThan(0);
  });

  it("reads the file from the working directory", async () => {
    await workingDirectoryWith(
      JSON.stringify({
        vocabularyVersion: "v1-0123abcd",
        terms: ["Alfa"],
        aliases: { Alfa: ["a"] },
      }),
    );
    await expect(loadVocabulary()).resolves.toEqual({
      vocabularyVersion: "v1-0123abcd",
      terms: ["Alfa"],
      aliases: { Alfa: ["a"] },
    });
  });

  it("throws when an alias key is not a term", async () => {
    await workingDirectoryWith(
      JSON.stringify({
        vocabularyVersion: "v1-0123abcd",
        terms: ["Alfa"],
        aliases: { Beta: ["b"] },
      }),
    );
    await expect(loadVocabulary()).rejects.toThrow(
      /^Invalid vocabulary file: aliases\.Beta: .*not a term/,
    );
  });

  it("throws on a bad version", async () => {
    await workingDirectoryWith(
      JSON.stringify({ vocabularyVersion: "1", terms: ["Alfa"], aliases: {} }),
    );
    await expect(loadVocabulary()).rejects.toThrow(/vocabularyVersion/);
  });

  it("throws on a file that is not JSON", async () => {
    await workingDirectoryWith("not json");
    await expect(loadVocabulary()).rejects.toThrow(
      "Invalid vocabulary file: not JSON",
    );
  });

  it("throws when the file is missing", async () => {
    await workingDirectoryWith(undefined);
    await expect(loadVocabulary()).rejects.toThrow();
  });
});

const EXAMPLE = "data/fixtures/example-nordic-digital";

// A working directory holding the Example pair files given, by name.
async function exampleFolderWith(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "example-"));
  folders.push(root);
  const folder = join(root, EXAMPLE);
  await mkdir(folder, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(join(folder, name), content),
    ),
  );
  vi.spyOn(process, "cwd").mockReturnValue(root);
}

describe("FR-8 loadExamplePair (AD-15)", () => {
  it("reads the real Example pair Fixture", async () => {
    const pair = await loadExamplePair();
    expect(pair.cvText).toBe(readFileSync(`${EXAMPLE}/cv.txt`, "utf8"));
    expect(pair.jobAd).toBe(readFileSync(`${EXAMPLE}/ad.txt`, "utf8"));
    expect(pair).toMatchObject({
      jobTitle: "Junior frontendutvikler",
      employer: "Nordic Digital",
    });
  });

  it("reads the files from the working directory", async () => {
    await exampleFolderWith({
      "cv.txt": "CV",
      "ad.txt": "AD",
      "meta.json": JSON.stringify({ jobTitle: "T", employer: "E" }),
    });
    await expect(loadExamplePair()).resolves.toEqual({
      cvText: "CV",
      jobAd: "AD",
      jobTitle: "T",
      employer: "E",
    });
  });

  it("throws when meta.json is not JSON", async () => {
    await exampleFolderWith({
      "cv.txt": "CV",
      "ad.txt": "AD",
      "meta.json": "not json",
    });
    await expect(loadExamplePair()).rejects.toThrow(
      "Invalid example pair: meta.json is not JSON",
    );
  });

  it("throws when meta.json has no employer", async () => {
    await exampleFolderWith({
      "cv.txt": "CV",
      "ad.txt": "AD",
      "meta.json": JSON.stringify({ jobTitle: "T" }),
    });
    await expect(loadExamplePair()).rejects.toThrow(
      /^Invalid example pair: employer/,
    );
  });

  it("throws when a file is missing", async () => {
    await exampleFolderWith({
      "ad.txt": "AD",
      "meta.json": JSON.stringify({ jobTitle: "T", employer: "E" }),
    });
    await expect(loadExamplePair()).rejects.toThrow();
  });
});

const FIXTURES = "data/fixtures";
const META = JSON.stringify({ jobTitle: "T", employer: "E" });

// A working directory with fixture folders: id -> file name -> content.
async function fixturesWith(
  tree: Record<string, Record<string, string | Uint8Array>>,
) {
  const root = await mkdtemp(join(tmpdir(), "fixtures-"));
  folders.push(root);
  await mkdir(join(root, FIXTURES), { recursive: true });
  for (const [id, files] of Object.entries(tree)) {
    for (const [name, content] of Object.entries(files)) {
      const file = join(root, FIXTURES, id, name);
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, content);
    }
  }
  vi.spyOn(process, "cwd").mockReturnValue(root);
}

describe("FR-27 loadFixtures (AD-15)", () => {
  it("reads the real Fixtures, skips folders starting with _ and finds the Example pair", async () => {
    const fixtures = await loadFixtures();
    expect(fixtures.map((fixture) => fixture.id)).toContain(
      "example-nordic-digital",
    );
    expect(fixtures.every((fixture) => !fixture.id.startsWith("_"))).toBe(true);
    const example = fixtures.find(
      (fixture) => fixture.id === "example-nordic-digital",
    );
    expect(example?.cvPdf?.byteLength).toBeGreaterThan(0);
    expect(example?.jobTitle).toBe("Junior frontendutvikler");
  });

  it("reads the files, the optional cv.pdf and the Cached Letters by Tone", async () => {
    await fixturesWith({
      b: {
        "cv.txt": "CV",
        "ad.txt": "AD",
        "meta.json": META,
        "cv.pdf": new Uint8Array([1, 2, 3]),
        "cached/letter-direkte.json": '{"data":{"text":"d"}}',
        "cached/letter-formell.json": '{"data":{"text":"f"}}',
      },
      a: { "cv.txt": "CV2", "ad.txt": "AD2", "meta.json": META },
      _planted: { "cv.txt": "x" },
    });
    const fixtures = await loadFixtures();
    // `a` has no Cached Letters, so it is not a Test-mode source.
    expect(fixtures.map((fixture) => fixture.id)).toEqual(["b"]);
    expect(Array.from(fixtures[0]?.cvPdf ?? [])).toEqual([1, 2, 3]);
    expect(fixtures[0]?.cachedLetters).toEqual([
      {
        tone: "Formell",
        file: "letter-formell.json",
        content: { data: { text: "f" } },
      },
      {
        tone: "Direkte",
        file: "letter-direkte.json",
        content: { data: { text: "d" } },
      },
    ]);
  });

  it("throws when a Cached file is not JSON, naming the file", async () => {
    await fixturesWith({
      a: {
        "cv.txt": "CV",
        "ad.txt": "AD",
        "meta.json": META,
        "cached/letter-formell.json": "not json",
      },
    });
    await expect(loadFixtures()).rejects.toThrow(
      "Invalid Cached response a/letter-formell.json: not JSON",
    );
  });

  it("throws when meta.json is not valid or a file is missing, for a Fixture with Cached Letters", async () => {
    const cached = { "cached/letter-formell.json": '{"data":{"text":"f"}}' };
    await fixturesWith({
      a: {
        "cv.txt": "CV",
        "ad.txt": "AD",
        "meta.json": '{"jobTitle":"T"}',
        ...cached,
      },
    });
    await expect(loadFixtures()).rejects.toThrow(
      /^Invalid Fixture a: employer/,
    );
    await fixturesWith({ a: { "cv.txt": "CV", "meta.json": META, ...cached } });
    await expect(loadFixtures()).rejects.toThrow();
  });

  it("ignores a half-built Fixture that has no Cached Letters", async () => {
    await fixturesWith({
      a: { "cv.txt": "CV" },
      b: {
        "cv.txt": "CV",
        "ad.txt": "AD",
        "meta.json": META,
        "cached/letter-formell.json": '{"data":{"text":"f"}}',
      },
    });
    expect((await loadFixtures()).map((fixture) => fixture.id)).toEqual(["b"]);
  });
});

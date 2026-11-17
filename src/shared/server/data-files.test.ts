import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VOCABULARY_VERSION_FORMAT } from "@/shared/core/vocabulary";
import { loadExamplePair, loadVocabulary } from "./data-files";

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

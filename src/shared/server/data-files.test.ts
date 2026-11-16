import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VOCABULARY_VERSION_FORMAT } from "@/shared/core/vocabulary";
import { loadVocabulary } from "./data-files";

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

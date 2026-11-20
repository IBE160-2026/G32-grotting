import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { type Vocabulary, vocabularySchema } from "@/shared/core/vocabulary";

// Runtime reads of `data/` go only through this file (AD-15). The folder is
// read from the working directory, so `next.config.ts` lists it for file
// tracing on Vercel and the Docker image keeps the whole source tree.

/**
 * The Keyword vocabulary, read from `data/vocabulary/nb.json` and validated.
 * Throws when the file is missing, is not JSON or does not match the schema.
 */
export async function loadVocabulary(): Promise<Vocabulary> {
  const file = join(process.cwd(), "data", "vocabulary", "nb.json");
  let json: unknown;
  try {
    json = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid vocabulary file: not JSON");
    }
    throw error;
  }
  const parsed = vocabularySchema.safeParse(json);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid vocabulary file: ${problems}`);
  }
  return parsed.data;
}

const exampleMetaSchema = z.object({
  jobTitle: z.string().min(1),
  employer: z.string().min(1),
});

/** The Example pair as the inputs of an analysis. */
export type ExamplePair = {
  readonly cvText: string;
  readonly jobAd: string;
  readonly jobTitle: string;
  readonly employer: string;
};

/**
 * The Example pair Fixture, read from `data/fixtures/example-nordic-digital/`:
 * `cv.txt`, `ad.txt` and `meta.json`. Throws when a file is missing or
 * `meta.json` is not JSON or has no job title and employer.
 */
export async function loadExamplePair(): Promise<ExamplePair> {
  const folder = join(
    process.cwd(),
    "data",
    "fixtures",
    "example-nordic-digital",
  );
  const [cvText, jobAd, metaText] = await Promise.all([
    readFile(join(folder, "cv.txt"), "utf8"),
    readFile(join(folder, "ad.txt"), "utf8"),
    readFile(join(folder, "meta.json"), "utf8"),
  ]);
  let json: unknown;
  try {
    json = JSON.parse(metaText);
  } catch {
    throw new Error("Invalid example pair: meta.json is not JSON");
  }
  const meta = exampleMetaSchema.safeParse(json);
  if (!meta.success) {
    const problems = meta.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid example pair: ${problems}`);
  }
  return { cvText, jobAd, ...meta.data };
}

// The Tones that have a Cached Letter, as they are written in the lookup key.
// The file is `cached/letter-<tone in lower case>.json`; the recorder
// (`scripts/record-cached.ts`) is its only writer.
const CACHED_TONES = ["Formell", "Personlig", "Direkte"] as const;

/** One `cached/letter-<tone>.json`, as parsed JSON: `ai` validates it. */
export type CachedLetterFile = {
  readonly tone: (typeof CACHED_TONES)[number];
  readonly file: string;
  readonly content: unknown;
};

/** `cached/keywords.json` (FR-5b), as parsed JSON: `ai` validates it. */
export type CachedKeywordsFile = {
  readonly file: string;
  readonly content: unknown;
};

/** `cached/gaps.json` (FR-13, Story 4.3), as parsed JSON: `ai` validates it. */
export type CachedGapsFile = {
  readonly file: string;
  readonly content: unknown;
};

/** The files of one Fixture folder that a Test-mode run needs. */
export type FixtureFiles = {
  readonly id: string;
  readonly cvText: string;
  /** The bytes of `cv.pdf`, when the Fixture has one. */
  readonly cvPdf: Uint8Array | undefined;
  readonly jobAd: string;
  readonly jobTitle: string;
  readonly employer: string;
  /** The Cached Letters that exist, in Tone order. */
  readonly cachedLetters: readonly CachedLetterFile[];
  /** The Cached Keyword list, when the Fixture has one. */
  readonly cachedKeywords?: CachedKeywordsFile;
  /** The Cached Gaps, when the Fixture has them. */
  readonly cachedGaps?: CachedGapsFile;
};

const isMissing = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

async function readOptional<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

// The Cached Letters of one folder, in Tone order. A folder without any is not
// a Test-mode source, so a half-built one elsewhere cannot break the others.
async function loadCachedLetters(
  folder: string,
  id: string,
): Promise<CachedLetterFile[]> {
  const cachedLetters: CachedLetterFile[] = [];
  for (const tone of CACHED_TONES) {
    const file = `letter-${tone.toLowerCase()}.json`;
    const text = await readOptional(() =>
      readFile(join(folder, "cached", file), "utf8"),
    );
    if (text === undefined) continue;
    let content: unknown;
    try {
      content = JSON.parse(text);
    } catch {
      throw new Error(`Invalid Cached response ${id}/${file}: not JSON`);
    }
    cachedLetters.push({ tone, file, content });
  }
  return cachedLetters;
}

// `cached/<file>` of one folder, or nothing. Same JSON rule as a letter.
async function loadCachedFile(
  folder: string,
  id: string,
  file: "keywords.json" | "gaps.json",
): Promise<{ file: string; content: unknown } | undefined> {
  const text = await readOptional(() =>
    readFile(join(folder, "cached", file), "utf8"),
  );
  if (text === undefined) return undefined;
  try {
    return { file, content: JSON.parse(text) };
  } catch {
    throw new Error(`Invalid Cached response ${id}/${file}: not JSON`);
  }
}

async function loadFixtureFiles(
  root: string,
  id: string,
): Promise<FixtureFiles | undefined> {
  const folder = join(root, id);
  const cachedLetters = await loadCachedLetters(folder, id);
  const cachedKeywords = await loadCachedFile(folder, id, "keywords.json");
  const cachedGaps = await loadCachedFile(folder, id, "gaps.json");
  // A folder with none of them is not a Test-mode source.
  if (
    cachedLetters.length === 0 &&
    cachedKeywords === undefined &&
    cachedGaps === undefined
  ) {
    return undefined;
  }
  const [cvText, jobAd, metaText, cvPdf] = await Promise.all([
    readFile(join(folder, "cv.txt"), "utf8"),
    readFile(join(folder, "ad.txt"), "utf8"),
    readFile(join(folder, "meta.json"), "utf8"),
    readOptional(
      async () => new Uint8Array(await readFile(join(folder, "cv.pdf"))),
    ),
  ]);
  let json: unknown;
  try {
    json = JSON.parse(metaText);
  } catch {
    throw new Error(`Invalid Fixture ${id}: meta.json is not JSON`);
  }
  const meta = exampleMetaSchema.safeParse(json);
  if (!meta.success) {
    const problems = meta.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid Fixture ${id}: ${problems}`);
  }
  return {
    id,
    cvText,
    cvPdf,
    jobAd,
    ...meta.data,
    cachedLetters,
    ...(cachedKeywords === undefined ? {} : { cachedKeywords }),
    ...(cachedGaps === undefined ? {} : { cachedGaps }),
  };
}

/**
 * Every Fixture folder under `data/fixtures/` that does not start with `_`
 * (`_planted` is for tests), with `cv.txt`, `cv.pdf` when present, `ad.txt`,
 * `meta.json`, its Cached Letters, its Cached Keyword list and its Cached
 * Gaps. Sorted by id. Throws when a file a Fixture needs is missing or when
 * `meta.json` or a Cached file is not valid.
 */
export async function loadFixtures(): Promise<FixtureFiles[]> {
  const root = join(process.cwd(), "data", "fixtures");
  const entries = await readdir(root, { withFileTypes: true });
  const ids = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
  const loaded = await Promise.all(ids.map((id) => loadFixtureFiles(root, id)));
  return loaded.filter((fixture) => fixture !== undefined);
}

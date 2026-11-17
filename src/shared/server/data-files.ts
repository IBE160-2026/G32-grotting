import "server-only";
import { readFile } from "node:fs/promises";
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

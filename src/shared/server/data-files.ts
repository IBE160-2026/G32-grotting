import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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

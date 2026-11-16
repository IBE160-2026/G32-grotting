import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractText, getDocumentProxy } from "unpdf";

export const FIXTURES_DIR = fileURLToPath(
  new URL("../data/fixtures", import.meta.url),
);

// The text of a cv.pdf as it is stored in cv.txt: pages merged, CRLF turned
// into LF, one trailing newline (AD-15).
export async function extractCvText(pdf: Uint8Array): Promise<string> {
  const document = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(document, { mergePages: true });
  return `${text.replace(/\r\n?/g, "\n").trimEnd()}\n`;
}

// Fixture folders are the ones that don't start with "_" (_planted is for tests).
export async function fixtureIds(): Promise<string[]> {
  const entries = await readdir(FIXTURES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
}

async function main(): Promise<void> {
  for (const id of await fixtureIds()) {
    const folder = join(FIXTURES_DIR, id);
    const pdf = await readFile(join(folder, "cv.pdf")).catch(() => undefined);
    if (pdf === undefined) continue;
    await writeFile(join(folder, "cv.txt"), await extractCvText(pdf));
    process.stdout.write(`${id}: cv.txt written from cv.pdf\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

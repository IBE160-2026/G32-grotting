import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { type FixtureFiles, loadFixtures } from "@/shared/server/data-files";
import { aiResultMetaSchema } from "../../contracts";
import { lookupKeyOf } from "../../core/lookup-key";
import type { AiAdapterPort, AiUsage } from "./factory";

// No Cached response answers this request: it is not an input of a recorded
// Fixture. `runAi` turns it into TEST_MODE_UNAVAILABLE.
export class CachedMissError extends Error {
  constructor() {
    super("No Cached response for this request");
    this.name = "CachedMissError";
  }
}

// What `cached/letter-<tone>.json` holds: a raw `AiOutput<T>` (AD-3). Counts
// are optional; the recorder does not write them.
const cachedFileSchema = z.object({
  data: z.unknown(),
  meta: aiResultMetaSchema,
  usage: z
    .object({
      inputTokens: z.number().int().nonnegative().nullable(),
      outputTokens: z.number().int().nonnegative().nullable(),
    })
    .optional(),
});

type Entry = { readonly data: unknown; readonly usage: AiUsage };
type Index = ReadonlyMap<string, Entry>;
type LoadFixtures = () => Promise<readonly FixtureFiles[]>;

const NO_USAGE: AiUsage = { inputTokens: null, outputTokens: null };

// The text of cv.pdf the way the app reads an uploaded PDF (`cv/server`).
async function pdfText(bytes: Uint8Array): Promise<string> {
  // unpdf takes over the buffer, so it gets a copy.
  const document = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(document, { mergePages: true });
  return text.replace(/\r\n?/g, "\n");
}

// Every Cached Letter, under the lookup key of the request that asks for it.
// A Fixture is indexed once under the text of `cv.txt` and once under the text
// of `cv.pdf`, so a pasted CV, an uploaded PDF and «Bruk eksempelet» all find
// the same answer. The key comes from `lookupKeyOf`, as in `runAi`.
async function buildIndex(load: LoadFixtures): Promise<Index> {
  const index = new Map<string, Entry>();
  for (const fixture of await load()) {
    if (fixture.cachedLetters.length === 0) continue;
    const cvTexts = [fixture.cvText];
    if (fixture.cvPdf !== undefined) cvTexts.push(await pdfText(fixture.cvPdf));
    for (const letter of fixture.cachedLetters) {
      const parsed = cachedFileSchema.safeParse(letter.content);
      if (!parsed.success) {
        throw new Error(
          `Invalid Cached response ${fixture.id}/${letter.file}: not an AI output`,
        );
      }
      const entry: Entry = {
        data: parsed.data.data,
        usage: parsed.data.usage ?? NO_USAGE,
      };
      for (const cvText of cvTexts) {
        const key = lookupKeyOf({
          task: "letter",
          cvText,
          jobAd: fixture.jobAd,
          jobTitle: fixture.jobTitle,
          employer: fixture.employer,
          tone: letter.tone,
        });
        // The same CV text from cv.txt and cv.pdf is one entry; another
        // Fixture or file under the same key would hide a Cached Letter.
        if (index.get(key) !== undefined && index.get(key) !== entry) {
          throw new Error(`Duplicate Cached key: ${fixture.id}/${letter.file}`);
        }
        index.set(key, entry);
      }
    }
  }
  return index;
}

/**
 * The cached adapter (AD-3, AD-15): answers from `data/fixtures/<id>/cached/`
 * by the request's lookup key and makes no network call. The index is built on
 * the first request and kept; a failed build is tried again next time. A key
 * without a file throws `CachedMissError`.
 */
export function createCachedAdapter(
  load: LoadFixtures = loadFixtures,
): AiAdapterPort {
  let index: Promise<Index> | undefined;
  const getIndex = (): Promise<Index> => {
    index ??= buildIndex(load).catch((error: unknown) => {
      index = undefined;
      throw error;
    });
    return index;
  };

  return {
    kind: "cached",
    provider: "cached",
    model: "cached",
    async generate(args) {
      const entry = (await getIndex()).get(args.lookupKey);
      if (entry === undefined) throw new CachedMissError();
      return { output: entry.data, usage: entry.usage };
    },
  };
}

let shared: AiAdapterPort | undefined;

/** The one cached adapter of the process, so its index is built once. */
export function sharedCachedAdapter(): AiAdapterPort {
  shared ??= createCachedAdapter();
  return shared;
}

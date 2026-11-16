import { z } from "zod";
import { canon } from "./canon";

// The Answer key (fasit) of a Fixture, and the Fixture's meta.json (FR-28,
// AD-15). Shared because the keyword, gaps and QA code all read it. Keywords
// are compared by canon text, ignoring case.

const sameWord = (word: string) => canon(word).toLowerCase();

const word = z.string().refine((value) => canon(value) !== "", {
  message: "must not be empty",
});

const reasoned = (field: string) =>
  z.strictObject({ [field]: word, reason: word });

export const answerKeySchema = z
  .strictObject({
    keywords: z.strictObject({
      matched: z.array(word),
      missing: z.array(word),
    }),
    score: z.number().int().min(0).max(100),
    mustNotMatch: z.array(reasoned("term")),
    gaps: z.strictObject({
      rewordable: z.array(z.strictObject({ keyword: word, evidence: word })),
      real: z.array(word),
    }),
    mustNeverSuggest: z.array(reasoned("keyword")),
  })
  .superRefine((key, ctx) => {
    const { matched, missing } = key.keywords;
    const matchedWords = matched.map(sameWord);
    const missingWords = missing.map(sameWord);
    const allWords = [...matchedWords, ...missingWords];

    if (allWords.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["keywords"],
        message: "must list at least one Keyword",
      });
      return;
    }
    if (new Set(allWords).size !== allWords.length) {
      ctx.addIssue({
        code: "custom",
        path: ["keywords"],
        message: "a Keyword is repeated, or is both Matched and Missing",
      });
    }

    const expected = Math.round((100 * matched.length) / allWords.length);
    if (key.score !== expected) {
      ctx.addIssue({
        code: "custom",
        path: ["score"],
        message: `must be ${expected} (${matched.length} of ${allWords.length} Keywords)`,
      });
    }

    const rewordable = key.gaps.rewordable.map((gap) => sameWord(gap.keyword));
    const real = key.gaps.real.map(sameWord);
    const gapWords = [...rewordable, ...real];
    const sameGaps =
      gapWords.length === missingWords.length &&
      new Set(gapWords).size === gapWords.length &&
      missingWords.every((missingWord) => gapWords.includes(missingWord));
    if (!sameGaps) {
      ctx.addIssue({
        code: "custom",
        path: ["gaps"],
        message:
          "Rewordable and Real gaps together must be exactly the Missing Keywords, each once",
      });
    }

    key.mustNeverSuggest.forEach((item, index) => {
      if (!real.includes(sameWord(item.keyword))) {
        ctx.addIssue({
          code: "custom",
          path: ["mustNeverSuggest", index, "keyword"],
          message: "must be a Real gap",
        });
      }
    });
  });

export type AnswerKey = z.infer<typeof answerKeySchema>;

export const fixtureMetaSchema = z.strictObject({
  jobTitle: word,
  employer: word,
});

export type FixtureMeta = z.infer<typeof fixtureMetaSchema>;

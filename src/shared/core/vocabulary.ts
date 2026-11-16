import { z } from "zod";
import { canon } from "./canon";

// The versioned Keyword vocabulary (FR-5, NFR-6, AD-15): a curated list of
// terms written as displayed, and aliases that also find a term. Shared because
// the loader (shared/server) and keywords/core both use its shape. The version
// is `v1-` plus the first 8 hex characters of the sha256 of
// JSON.stringify({ terms, aliases }); a test recomputes it, since hashing needs
// node:crypto and this file stays pure.

export const VOCABULARY_VERSION_FORMAT = /^v1-[0-9a-f]{8}$/;

const canonKey = (word: string) => canon(word).toLowerCase();

const word = z.string().refine((value) => canon(value) !== "", {
  message: "must not be empty",
});

export const vocabularySchema = z
  .strictObject({
    vocabularyVersion: z.string().regex(VOCABULARY_VERSION_FORMAT, {
      message: "must look like v1-0123abcd",
    }),
    terms: z.array(word).min(1),
    aliases: z.record(z.string(), z.array(word)),
  })
  .superRefine((vocabulary, ctx) => {
    const seen = new Set<string>();
    vocabulary.terms.forEach((term, index) => {
      const key = canonKey(term);
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["terms", index],
          message: `«${term}» is a duplicate term`,
        });
      }
      seen.add(key);
    });

    const terms = new Set(vocabulary.terms);
    for (const key of Object.keys(vocabulary.aliases)) {
      if (!terms.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["aliases", key],
          message: `alias key «${key}» is not a term`,
        });
      }
    }
  });

export type Vocabulary = z.infer<typeof vocabularySchema>;

import { z } from "zod";

// Where an output came from: the adapter kind (AD-3).
export const AI_SOURCES = ["live", "cached", "mock"] as const;
export type AiSource = (typeof AI_SOURCES)[number];

// The single home of these shapes (AD-13). Cached responses on disk hold a raw
// `AiOutput<T>`, so the meta is a schema as well as a type.
export const aiResultMetaSchema = z.object({
  source: z.enum(AI_SOURCES),
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  createdAt: z.iso.datetime(),
});

export type AiResultMeta = z.infer<typeof aiResultMetaSchema>;

export type AiOutput<T> = {
  readonly data: T;
  readonly meta: AiResultMeta;
};

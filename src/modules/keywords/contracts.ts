import { z } from "zod";

// Where an analysis got its Keywords (AD-5). Phase 1 produces only `code`;
// `saved` and `code-fallback` come with the AI proposal in a later epic.
export const keywordSourceSchema = z.enum(["code", "saved", "code-fallback"]);

export type KeywordSource = z.infer<typeof keywordSourceSchema>;

export const keywordStageSchema = z.enum([
  "exact",
  "inflection",
  "compound",
  "alias",
]);

export const keywordPositionSchema = z.object({
  paragraph: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

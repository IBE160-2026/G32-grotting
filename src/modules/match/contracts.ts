import { z } from "zod";
import {
  keywordPositionSchema,
  keywordSourceSchema,
  keywordStageSchema,
} from "@/modules/keywords/contracts";

// An explanation is a key and its parameters, never prose: the UI maps the key
// to a bokmål text (AD-7).
export const explanationSchema = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("MATCH_FORMULA"),
    params: z.object({
      matched: z.number().int(),
      total: z.number().int(),
      score: z.number().int(),
    }),
  }),
  z.object({
    key: z.literal("MISSING_KEYWORD"),
    params: z.object({ keyword: z.string() }),
  }),
]);

export type Explanation = z.infer<typeof explanationSchema>;

// The CV line behind a Matched keyword.
export const evidenceSchema = z.object({
  stage: keywordStageSchema,
  line: z.number().int().positive(),
  text: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export type Evidence = z.infer<typeof evidenceSchema>;

const adSide = {
  term: z.string(),
  stage: keywordStageSchema,
  positions: z.array(keywordPositionSchema),
};

export const matchedKeywordSchema = z.object({
  ...adSide,
  evidence: evidenceSchema,
});

export const missingKeywordSchema = z.object({
  ...adSide,
  explanation: explanationSchema,
});

export type MatchedKeyword = z.infer<typeof matchedKeywordSchema>;
export type MissingKeyword = z.infer<typeof missingKeywordSchema>;

// The wire result of phase 1 (AD-6). No Verdict: the UI derives it from
// `score` with `verdictOf` (AD-7).
export const analysisResultSchema = z.object({
  keywordSource: keywordSourceSchema,
  score: z.number().int().min(0).max(100),
  matchedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().positive(),
  adParagraphs: z.number().int().nonnegative(),
  formula: explanationSchema,
  matched: z.array(matchedKeywordSchema),
  missing: z.array(missingKeywordSchema),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

import { z } from "zod";
import { type CvErrorCode, cvTextSchema } from "@/modules/cv/contracts";
import { analysisResultSchema } from "@/modules/match/contracts";

// FR-4: the Job ad is 200 to 15 000 characters; job title and employer are
// required and at most 200 characters each.
export const JOB_AD_MIN = 200;
export const JOB_AD_MAX = 15_000;
export const JOB_FIELD_MAX = 200;

// The codes the schema reports; the UI maps each to a text in messages.nb.ts
// (AD-7). Required and the minimum are judged on the trimmed text, the maximum
// on the text as typed, so a long paste is never cut to fit.
export const JOB_INPUT_ERROR_CODES = [
  "JOB_AD_LENGTH",
  "JOB_TITLE_REQUIRED",
  "EMPLOYER_REQUIRED",
  "TOO_LONG",
] as const;

export type JobInputErrorCode = (typeof JOB_INPUT_ERROR_CODES)[number];

// Every code a field of `AnalysisInputs` can report. `CV_NOT_CONFIRMED` is
// added by the form, not by the schema.
export type InputErrorCode = JobInputErrorCode | CvErrorCode;

// Windows line endings become LF where text enters the form (FR-4).
export function normaliseNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function requiredField(required: JobInputErrorCode) {
  return z.string().superRefine((value, ctx) => {
    if (value.trim().length === 0) {
      ctx.addIssue({ code: "custom", message: required });
    } else if (value.length > JOB_FIELD_MAX) {
      ctx.addIssue({ code: "custom", message: "TOO_LONG" });
    }
  });
}

// `AnalysisInputs` (AD-6): raw inputs only.
export const analysisInputsSchema = z.object({
  cvText: cvTextSchema,
  jobAd: z.string().superRefine((value, ctx) => {
    if (value.trim().length < JOB_AD_MIN || value.length > JOB_AD_MAX) {
      ctx.addIssue({ code: "custom", message: "JOB_AD_LENGTH" });
    }
  }),
  jobTitle: requiredField("JOB_TITLE_REQUIRED"),
  employer: requiredField("EMPLOYER_REQUIRED"),
});

export type AnalysisInputs = z.infer<typeof analysisInputsSchema>;

// Bumped when the result shape or the scoring changes, so an old fingerprint
// never matches a new contract (AD-6).
export const CONTRACT_VERSION = 1;

// `POST /api/analyses`. A client fingerprint is ignored in phase 1. The consent
// is the AI notice version the Student accepted: phase 1 may ask AI for the
// Keywords of a new ad only with it (FR-5b, FR-24); without it, or in Test
// mode, the list comes from a saved or Cached list or from code.
export const analyseRequestSchema = z.object({
  applicationId: z.uuid(),
  fingerprint: z.string().optional(),
  inputs: analysisInputsSchema,
  consent: z.object({ noticeVersion: z.string() }).nullable().optional(),
});

export type AnalyseRequest = z.infer<typeof analyseRequestSchema>;

// Story 6.7: with accounts on the answer says whether the Application was
// saved. `saved` is `{ seq }` when it was, `null` when the save failed (or the
// id is not the Student's), and absent with accounts off.
export const savedSchema = z.object({ seq: z.number().int().positive() });

export type Saved = z.infer<typeof savedSchema>;

export const analyseResponseSchema = z.object({
  result: analysisResultSchema,
  fingerprint: z.string(),
  saved: savedSchema.nullable().optional(),
});

export type AnalyseResponse = z.infer<typeof analyseResponseSchema>;
export type InputField = keyof AnalysisInputs;

// The first error code per field, for the form; the server uses the schema.
export function inputErrors(
  inputs: AnalysisInputs,
): Partial<Record<InputField, InputErrorCode>> {
  const result = analysisInputsSchema.safeParse(inputs);
  const errors: Partial<Record<InputField, InputErrorCode>> = {};
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const field = issue.path[0] as InputField;
    if (errors[field] === undefined) {
      errors[field] = issue.message as InputErrorCode;
    }
  }
  return errors;
}

// `GET /api/applications/next`: the number the Student's next Application gets.
export const nextApplicationSchema = z.object({
  seq: z.number().int().positive(),
});

export type NextApplication = z.infer<typeof nextApplicationSchema>;

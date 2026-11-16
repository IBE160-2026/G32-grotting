import { z } from "zod";

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

// The job fields of `AnalysisInputs` (AD-6). Story 1.10 adds `cvText`.
export const analysisInputsSchema = z.object({
  jobAd: z.string().superRefine((value, ctx) => {
    if (value.trim().length < JOB_AD_MIN || value.length > JOB_AD_MAX) {
      ctx.addIssue({ code: "custom", message: "JOB_AD_LENGTH" });
    }
  }),
  jobTitle: requiredField("JOB_TITLE_REQUIRED"),
  employer: requiredField("EMPLOYER_REQUIRED"),
});

export type AnalysisInputs = z.infer<typeof analysisInputsSchema>;
export type JobInputField = keyof AnalysisInputs;

// The first error code per field, for the form; the server uses the schema.
export function jobInputErrors(
  inputs: AnalysisInputs,
): Partial<Record<JobInputField, JobInputErrorCode>> {
  const result = analysisInputsSchema.safeParse(inputs);
  const errors: Partial<Record<JobInputField, JobInputErrorCode>> = {};
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const field = issue.path[0] as JobInputField;
    if (errors[field] === undefined) {
      errors[field] = issue.message as JobInputErrorCode;
    }
  }
  return errors;
}

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

// Story 6.8: `GET /api/applications` is the register of Historikk, newest first,
// 20 per page. A row carries only what the register shows (UX-DR21): the
// number, the date, the score and its counts, the job title, the employer and
// whether a Letter exists. The Job ad, the keyword lists, the Gaps and the
// Letter text never travel in it; the Letter is fetched per row, on a press.
// A title, an employer or the counts that cannot be read are `null` (AD-11:
// one section that fails does not fail the page).
export const APPLICATIONS_PAGE_SIZE = 20;

export const applicationEntrySchema = z.object({
  id: z.uuid(),
  seq: z.number().int().positive(),
  createdAt: z.string(),
  score: z.number().int().min(0).max(100),
  matchedCount: z.number().int().nonnegative().nullable(),
  totalCount: z.number().int().positive().nullable(),
  jobTitle: z.string().nullable(),
  employer: z.string().nullable(),
  hasLetter: z.boolean(),
});

export type ApplicationEntry = z.infer<typeof applicationEntrySchema>;

export const applicationListSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  // The lowest and the highest number of all the Student's entries, for the
  // range line «JA-001–JA-002»; null when there is none.
  firstSeq: z.number().int().positive().nullable(),
  lastSeq: z.number().int().positive().nullable(),
  entries: z.array(applicationEntrySchema),
});

export type ApplicationList = z.infer<typeof applicationListSchema>;

// The query string of the list: a whole page number from 1.
export const applicationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});

// `GET /api/applications/[id]/letter`: the stored Letter text of one entry, with
// the sign-off token still in it (the browser puts the Profile name in, as on
// Søknad).
export const applicationLetterSchema = z.object({ text: z.string() });

export type ApplicationLetter = z.infer<typeof applicationLetterSchema>;

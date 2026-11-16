import { z } from "zod";

// FR-2: pasted CV text is 200 to 20 000 characters.
export const CV_MIN = 200;
export const CV_MAX = 20_000;

// The codes the CV slot reports; the UI maps each to a text in messages.nb.ts
// (AD-7). `CV_NOT_CONFIRMED` is not a schema issue: the text may be fine and
// still has not been approved (FR-3).
export const CV_ERROR_CODES = ["CV_LENGTH", "CV_NOT_CONFIRMED"] as const;

export type CvErrorCode = (typeof CV_ERROR_CODES)[number];

// The minimum is judged on the trimmed text, the maximum on the text as typed,
// so a long paste is never cut to fit.
export const cvTextSchema = z.string().superRefine((value, ctx) => {
  if (value.trim().length < CV_MIN || value.length > CV_MAX) {
    ctx.addIssue({ code: "custom", message: "CV_LENGTH" });
  }
});

export function cvLengthError(text: string): "CV_LENGTH" | undefined {
  return cvTextSchema.safeParse(text).success ? undefined : "CV_LENGTH";
}

// What a submit says about the CV: the length first, then the missing
// confirmation (FR-3).
export function cvSubmitError(
  draft: string,
  confirmed: boolean,
): CvErrorCode | undefined {
  return cvLengthError(draft) ?? (confirmed ? undefined : "CV_NOT_CONFIRMED");
}

export type CvState = { draft: string; confirmed: boolean };

// A confirmed CV exists only while the stored confirmed text is valid and still
// equals the draft; anything else comes back as an unconfirmed draft (AD-16).
export function restoreCv(stored: {
  cvText?: string | undefined;
  cvDraft?: string | undefined;
}): CvState {
  const draft = stored.cvDraft ?? stored.cvText ?? "";
  const confirmed =
    stored.cvText !== undefined &&
    stored.cvText === draft &&
    cvLengthError(draft) === undefined;
  return { draft, confirmed };
}

// FR-1: a CV file is a .pdf or .txt of at most 2 MB.
export const CV_FILE_MAX_BYTES = 2 * 1024 * 1024;
export const CV_FILE_EXTENSIONS = [".pdf", ".txt"] as const;

export type CvFileKind = "pdf" | "txt";

// The codes a wrong file is reported with; the UI maps each to a text in
// messages.nb.ts. The server answers the same two as INVALID_INPUT with the
// field `file.type` or `file.size`.
export type CvFileErrorCode = "FILE_TYPE" | "FILE_TOO_LARGE";

// Browsers report empty or wrong MIME types, so the extension decides, judged
// case-insensitively.
export function cvFileKind(name: string): CvFileKind | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".txt")) return "txt";
  return undefined;
}

// The one check the browser and the route share. The type is judged first.
export function cvFileError(
  name: string,
  size: number,
): CvFileErrorCode | undefined {
  if (cvFileKind(name) === undefined) return "FILE_TYPE";
  return size > CV_FILE_MAX_BYTES ? "FILE_TOO_LARGE" : undefined;
}

// What `POST /api/cv/extract` returns: the text as found, and whether the file
// held none (a scanned PDF), in which case `text` is empty.
export const cvExtractResponseSchema = z.object({
  text: z.string(),
  noText: z.boolean(),
});
export type CvExtractResponse = z.infer<typeof cvExtractResponseSchema>;

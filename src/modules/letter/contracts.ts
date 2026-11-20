import { z } from "zod";
import { aiResultMetaSchema } from "@/modules/ai/contracts";
import { analysisInputsSchema } from "@/modules/application/contracts";
import { CV_MAX } from "@/modules/cv/contracts";

// The three Tones of the Letter (FR-10). «Formell» is the default in the UI.
export const TONES = ["Formell", "Personlig", "Direkte"] as const;
export type Tone = (typeof TONES)[number];

// Where the Student's name goes. The server adds it when the AI left it out and
// the name is never sent to the AI (AD-7).
export const SIGNATURE_TOKEN = "{{SIGNATUR}}";

// `rev` counts the drafts of one Application; the client sends the last one it
// saw and the server answers with the next number.
export const letterSchema = z.object({
  text: z.string(),
  tone: z.enum(TONES),
  rev: z.number().int().nonnegative(),
});

export type Letter = z.infer<typeof letterSchema>;

// `POST /api/analyses/[id]/letter`. Unknown fields (such as a name) are dropped.
export const letterRequestSchema = z.object({
  applicationId: z.uuid(),
  fingerprint: z.string(),
  inputs: analysisInputsSchema,
  tone: z.enum(TONES),
  consent: z.object({ noticeVersion: z.string() }).nullable(),
  previousRev: z.number().int().nonnegative().max(1_000_000).default(0),
});

export type LetterRequest = z.infer<typeof letterRequestSchema>;

export const letterResponseSchema = z.object({
  letter: letterSchema,
  meta: aiResultMetaSchema,
});

export type LetterResponse = z.infer<typeof letterResponseSchema>;

// The integrity guard on the Letter (FR-11, AD-14). A flag says what to check:
// `term` is the Keyword or Upgrade word, `word` the form as it stands in the
// Letter, `spans` its places in the Letter text (CRLF and lone CR counted as
// LF, end exclusive). A type test keeps this equal to `integrity/core`'s
// `LetterFlag`.
export const LETTER_FLAG_KINDS = ["UNSUPPORTED_CLAIM", "UPGRADE_WORD"] as const;

export const letterFlagSchema = z.object({
  kind: z.enum(LETTER_FLAG_KINDS),
  term: z.string(),
  word: z.string(),
  spans: z.array(
    z.object({
      start: z.number().int().nonnegative(),
      end: z.number().int().nonnegative(),
    }),
  ),
});

export type LetterFlagWire = z.infer<typeof letterFlagSchema>;

// The Letter text the check accepts: well above the 400 words asked for.
export const LETTER_CHECK_TEXT_MAX = 20_000;

const revSchema = z.number().int().nonnegative().max(1_000_000);

// What the check reads of a Gap (FR-11, FR-15): its keyword, its kind and its
// citation. The explanation and the suggestion are not sent. A type test keeps
// this shape equal to `integrity/core`'s `CheckableGap`.
export const LETTER_CHECK_GAPS_MAX = 200;
// A citation is a piece of the CV, so it can be as long as the CV may be.
export const LETTER_CHECK_CITATION_MAX = CV_MAX;

export const checkGapSchema = z.object({
  keyword: z.string().max(200),
  kind: z.enum(["rewordable", "real"]),
  citation: z.string().max(LETTER_CHECK_CITATION_MAX).nullable(),
});

export type CheckGap = z.infer<typeof checkGapSchema>;

// `POST /api/analyses/[id]/letter-check`. The server takes no Missing keywords
// from the client: it recomputes phase 1 from `inputs`. `gaps` is `null` when
// Gap analysis failed or is off; the server re-checks every citation, so the
// client's word that a Gap is Rewordable is never taken as it stands.
// `letter.rev` must equal `letterRev`.
export const letterCheckRequestSchema = z
  .object({
    applicationId: z.uuid(),
    fingerprint: z.string(),
    inputs: analysisInputsSchema,
    letter: z.object({
      text: z.string().max(LETTER_CHECK_TEXT_MAX),
      tone: z.enum(TONES),
      rev: revSchema,
    }),
    gaps: z.array(checkGapSchema).max(LETTER_CHECK_GAPS_MAX).nullable(),
    letterRev: revSchema,
    gapsRev: revSchema,
  })
  .refine((request) => request.letter.rev === request.letterRev, {
    path: ["letterRev"],
  });

export type LetterCheckRequest = z.infer<typeof letterCheckRequestSchema>;

// What the check answers. The client shows it only while `letterRev` is the rev
// of the Letter on screen and `gapsRev` is the rev of the Gap analysis shown.
export const letterCheckSchema = z.object({
  flags: z.array(letterFlagSchema),
  letterRev: revSchema,
  gapsRev: revSchema,
});

export type LetterCheck = z.infer<typeof letterCheckSchema>;

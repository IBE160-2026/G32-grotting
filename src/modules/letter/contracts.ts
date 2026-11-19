import { z } from "zod";
import { aiResultMetaSchema } from "@/modules/ai/contracts";
import { analysisInputsSchema } from "@/modules/application/contracts";

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

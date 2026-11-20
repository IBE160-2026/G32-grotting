import { z } from "zod";
import { aiResultMetaSchema } from "@/modules/ai/contracts";
import { analysisInputsSchema } from "@/modules/application/contracts";

// The two kinds of Gap (FR-13): the CV already shows the keyword in other
// words (rewordable), or it does not (real).
export const GAP_KINDS = ["rewordable", "real"] as const;
export type GapKind = (typeof GAP_KINDS)[number];

// The key of the fixed Real-gap text. The server sends a key and its
// parameters, never prose; the UI maps the key to a text in messages.nb.ts
// (AD-7).
export const REAL_GAP_KEY = "REAL_GAP";

// The explanation is the AI's text, or the template as `{ key, params }` for a
// skipped or downgraded Gap (AD-7, AD-14).
export const gapExplanationSchema = z.union([
  z.object({ text: z.string() }),
  z.object({
    key: z.literal(REAL_GAP_KEY),
    params: z.object({ keyword: z.string() }),
  }),
]);

export type GapExplanation = z.infer<typeof gapExplanationSchema>;

// The fixed Gap shape (AD-7). `citation` is set only on a rewordable Gap.
// `suggestion` is `null` until Epic 5.
export const gapSchema = z.object({
  keyword: z.string(),
  kind: z.enum(GAP_KINDS),
  explanation: gapExplanationSchema,
  citation: z.string().nullable(),
  suggestion: z.string().nullable(),
});

export type Gap = z.infer<typeof gapSchema>;

// `POST /api/analyses/[id]/gaps` (AD-6). Unknown fields are dropped: the
// Missing keywords are never taken from the client.
export const gapsRequestSchema = z.object({
  applicationId: z.uuid(),
  fingerprint: z.string(),
  inputs: analysisInputsSchema,
  consent: z.object({ noticeVersion: z.string() }).nullable(),
});

export type GapsRequest = z.infer<typeof gapsRequestSchema>;

// `meta` is `null` when no Keyword is missing and so no AI request was made.
export const gapsResponseSchema = z.object({
  gaps: z.array(gapSchema),
  meta: aiResultMetaSchema.nullable(),
});

export type GapsResponse = z.infer<typeof gapsResponseSchema>;

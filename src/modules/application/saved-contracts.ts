import { z } from "zod";
import { gapSchema } from "@/modules/gaps/contracts";
import { letterFlagSchema, letterSchema } from "@/modules/letter/contracts";
import { analysisResultSchema } from "@/modules/match/contracts";

// Story 6.9: `GET /api/applications/[id]`, one stored Application, read-only.
// Kept apart from `contracts.ts`: the Letter and Gaps contracts import
// `application/contracts`, so importing them there would be a cycle.

// A section of the row as the answer carries it. `missing`: the column is null,
// the part was never made. `unreadable`: the section does not decrypt or does
// not parse. One unreadable section does not fail the page (AD-11).
export function savedSection<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion("status", [
    z.object({ status: z.literal("ok"), value }),
    z.object({ status: z.literal("missing") }),
    z.object({ status: z.literal("unreadable") }),
  ]);
}

export type SavedSection<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "missing" }
  | { readonly status: "unreadable" };

// What phase 1 saved of the Job. The CV text is never part of it.
export const savedJobSchema = z.object({
  jobAd: z.string(),
  jobTitle: z.string(),
  employer: z.string(),
});

export type SavedJob = z.infer<typeof savedJobSchema>;

// The Student's next lower entry, for the link to it. `employer` is null when
// its job section cannot be read.
export const savedPreviousSchema = z.object({
  id: z.uuid(),
  seq: z.number().int().positive(),
  employer: z.string().nullable(),
});

export const savedApplicationSchema = z.object({
  id: z.uuid(),
  seq: z.number().int().positive(),
  createdAt: z.string(),
  previous: savedPreviousSchema.nullable(),
  job: savedSection(savedJobSchema),
  analysis: savedSection(analysisResultSchema),
  gaps: savedSection(z.array(gapSchema)),
  letter: savedSection(letterSchema),
  // The flags of the Letter check: non-null only when the stored check is
  // readable, was made for the Letter and Gaps now on the row, and a Letter is
  // shown. A stale, unreadable or absent check is null; it is never sent as if
  // it were valid.
  check: z.array(letterFlagSchema).nullable(),
});

export type SavedApplication = z.infer<typeof savedApplicationSchema>;

import {
  analyseInputs,
  getApplicationMeta,
  saveLetter,
} from "@/modules/application";
import { aiContextFor, handleCaller } from "@/modules/identity";
import { generateLetter } from "@/modules/letter";
import { letterRequestSchema } from "@/modules/letter/contracts";
import { loadVocabulary } from "@/shared/server/data-files";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";
import { log } from "@/shared/server/log";

const ROUTE = "/api/analyses/[id]/letter";

// One AI request, up to its 90 s limit, plus phase 1 in front of it.
export const maxDuration = 120;

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// FR-9, FR-10, FR-26: phase 2. Recomputes phase 1 from the raw inputs, checks
// the fingerprint and makes exactly one AI request; the Matched keywords come
// from the server's own analysis, never from the client. With accounts on the
// Application must exist for the session's Student (else NOT_FOUND, before any
// request) and a successful Letter is written to it, best effort (Story 6.7):
// a failed write is logged and never changes or withholds the answer.
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { id } = await params;
  return handleCaller(ROUTE, async (req, ctx) => {
    const body = await req.json().catch(() => undefined);
    const parsed = letterRequestSchema.parse(body);
    if (id !== parsed.applicationId) {
      throw new ApiError("INVALID_INPUT", { field: "applicationId" });
    }
    const studentId = ctx.session?.studentId;
    if (
      studentId !== undefined &&
      (await getApplicationMeta(studentId, await getDb(), id)) === null
    ) {
      throw new ApiError("NOT_FOUND");
    }

    // No `ai` option: the Keyword list is the one phase 1 saved, never a new
    // request, so this route makes exactly one AI request.
    const analysed = await analyseInputs(parsed.inputs, await loadVocabulary());
    if (!analysed.ok) {
      throw new ApiError("INVALID_INPUT", { field: "inputs.jobAd" });
    }
    if (analysed.value.fingerprint !== parsed.fingerprint) {
      throw new ApiError("ANALYSIS_STALE");
    }

    const generated = await generateLetter(
      {
        inputs: parsed.inputs,
        tone: parsed.tone,
        matchedTerms: analysed.value.result.matched.map(({ term }) => term),
        previousRev: parsed.previousRev,
      },
      await aiContextFor(ctx.session, parsed.consent, await getDb()),
    );
    if (!generated.ok) {
      throw new ApiError(generated.error.code, {
        retryable: generated.error.retryable,
      });
    }

    if (studentId !== undefined) {
      try {
        const written = await saveLetter(
          studentId,
          await getDb(),
          { id, fingerprint: parsed.fingerprint },
          generated.value.letter,
        );
        if (!written) {
          log({
            kind: "error",
            code: "ANALYSIS_STALE",
            errorName: "NoRowWritten",
            route: ROUTE,
          });
        }
      } catch (error) {
        log({
          kind: "error",
          code: "UNEXPECTED",
          errorName: error instanceof Error ? error.name : "UnknownError",
          route: ROUTE,
        });
      }
    }
    return generated.value;
  })(request);
}

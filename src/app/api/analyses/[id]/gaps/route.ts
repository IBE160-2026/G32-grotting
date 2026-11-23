import {
  analyseInputs,
  getApplicationMeta,
  saveGaps,
} from "@/modules/application";
import { analyseGaps } from "@/modules/gaps";
import { gapsRequestSchema } from "@/modules/gaps/contracts";
import { aiContextFor, handleCaller } from "@/modules/identity";
import { getConfig } from "@/shared/server/config";
import { loadVocabulary } from "@/shared/server/data-files";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";
import { log } from "@/shared/server/log";

const ROUTE = "/api/analyses/[id]/gaps";

// One AI request, up to its 90 s limit, plus phase 1 in front of it.
export const maxDuration = 120;

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// FR-13, FR-14: phase 2. Recomputes phase 1 from the raw inputs, checks the
// fingerprint and makes exactly one AI request; the Missing keywords come from
// the server's own analysis, never from the client. While `features.gaps` is off
// the route does not exist, as far as a caller can tell. With accounts on the
// Application must exist for the session's Student (else NOT_FOUND, before any
// request) and a successful Gap analysis is written to it, best effort
// (Story 6.7): a failed write is logged and never changes the answer.
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { id } = await params;
  return handleCaller(ROUTE, async (req, ctx) => {
    if (!getConfig().features.gaps) throw new ApiError("NOT_FOUND");

    const body = await req.json().catch(() => undefined);
    const parsed = gapsRequestSchema.parse(body);
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
    const vocabulary = await loadVocabulary();
    const analysed = await analyseInputs(parsed.inputs, vocabulary);
    if (!analysed.ok) {
      throw new ApiError("INVALID_INPUT", { field: "inputs.jobAd" });
    }
    if (analysed.value.fingerprint !== parsed.fingerprint) {
      throw new ApiError("ANALYSIS_STALE");
    }

    const analysedGaps = await analyseGaps(
      {
        inputs: parsed.inputs,
        missingTerms: analysed.value.result.missing.map(({ term }) => term),
        rewording: getConfig().features.rewording,
        vocabulary,
      },
      await aiContextFor(ctx.session, parsed.consent, await getDb()),
    );
    if (!analysedGaps.ok) {
      throw new ApiError(analysedGaps.error.code, {
        retryable: analysedGaps.error.retryable,
      });
    }

    if (studentId !== undefined) {
      try {
        const written = await saveGaps(
          studentId,
          await getDb(),
          {
            id,
            fingerprint: parsed.fingerprint,
            gapsRev: (parsed.previousRev ?? 0) + 1,
          },
          analysedGaps.value.gaps,
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
    return analysedGaps.value;
  })(request);
}

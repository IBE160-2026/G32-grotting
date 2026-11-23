import {
  checkLetterFor,
  getApplicationMeta,
  saveLetterCheck,
} from "@/modules/application";
import { handleCaller } from "@/modules/identity";
import { letterCheckRequestSchema } from "@/modules/letter/contracts";
import { loadVocabulary } from "@/shared/server/data-files";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";
import { log } from "@/shared/server/log";

const ROUTE = "/api/analyses/[id]/letter-check";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// FR-11, AD-6: the integrity guard on a Letter. Code only, no AI request: it
// recomputes phase 1 from the raw inputs, checks the fingerprint and returns
// the flags; the Missing keywords never come from the client. With accounts on
// the Application must exist for the session's Student (else NOT_FOUND) and the
// check is stored on it only while both revs are the row's (Story 6.7); a
// failed or unmatched write is logged and the flags are answered all the same.
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { id } = await params;
  return handleCaller(ROUTE, async (req, ctx) => {
    const body = await req.json().catch(() => undefined);
    const parsed = letterCheckRequestSchema.parse(body);
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

    const checked = await checkLetterFor(parsed, await loadVocabulary());
    if (!checked.ok) {
      if (checked.error === "ANALYSIS_STALE") {
        throw new ApiError("ANALYSIS_STALE");
      }
      throw new ApiError("INVALID_INPUT", { field: "inputs.jobAd" });
    }

    if (studentId !== undefined) {
      try {
        const written = await saveLetterCheck(
          studentId,
          await getDb(),
          {
            id,
            fingerprint: parsed.fingerprint,
            letterRev: parsed.letterRev,
            gapsRev: parsed.gapsRev,
          },
          checked.value,
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
    return checked.value;
  })(request);
}

import { analyseInputs } from "@/modules/application";
import { aiContextFor, handleCaller } from "@/modules/identity";
import { generateLetter } from "@/modules/letter";
import { letterRequestSchema } from "@/modules/letter/contracts";
import { loadVocabulary } from "@/shared/server/data-files";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";

// One AI request, up to its 90 s limit, plus phase 1 in front of it.
export const maxDuration = 120;

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// FR-9, FR-10, FR-26: phase 2. Recomputes phase 1 from the raw inputs, checks
// the fingerprint and makes exactly one AI request. Stores nothing; the Matched
// keywords come from the server's own analysis, never from the client.
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { id } = await params;
  return handleCaller("/api/analyses/[id]/letter", async (req, ctx) => {
    const body = await req.json().catch(() => undefined);
    const parsed = letterRequestSchema.parse(body);
    if (id !== parsed.applicationId) {
      throw new ApiError("INVALID_INPUT", { field: "applicationId" });
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
    return generated.value;
  })(request);
}

import { checkLetterFor } from "@/modules/application";
import { letterCheckRequestSchema } from "@/modules/letter/contracts";
import { loadVocabulary } from "@/shared/server/data-files";
import { ApiError, handle } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// FR-11, AD-6: the integrity guard on a Letter. Code only, no AI request: it
// recomputes phase 1 from the raw inputs, checks the fingerprint and returns
// the flags. Stores nothing; the Missing keywords never come from the client.
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { id } = await params;
  return handle("/api/analyses/[id]/letter-check", async (req) => {
    const body = await req.json().catch(() => undefined);
    const parsed = letterCheckRequestSchema.parse(body);
    if (id !== parsed.applicationId) {
      throw new ApiError("INVALID_INPUT", { field: "applicationId" });
    }

    const checked = await checkLetterFor(parsed, await loadVocabulary());
    if (!checked.ok) {
      if (checked.error === "ANALYSIS_STALE") {
        throw new ApiError("ANALYSIS_STALE");
      }
      throw new ApiError("INVALID_INPUT", { field: "inputs.jobAd" });
    }
    return checked.value;
  })(request);
}

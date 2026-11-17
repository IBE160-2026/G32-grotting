import { analyseInputs } from "@/modules/application";
import { analyseRequestSchema } from "@/modules/application/contracts";
import { loadVocabulary } from "@/shared/server/data-files";
import { ApiError, handle } from "@/shared/server/handle";

// Phase 1 is code only and quick; the limit is set for the AI phases that join
// this route later.
export const maxDuration = 120;

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// FR-4, FR-5, FR-7: scores the CV against the Job ad with ordinary code and
// returns `{ result, fingerprint }`. Makes no network request and stores
// nothing. A client fingerprint is ignored in phase 1.
export const POST = handle("/api/analyses", async (request) => {
  const body = await request.json().catch(() => undefined);
  const { inputs } = analyseRequestSchema.parse(body);

  const vocabulary = await loadVocabulary();
  const analysed = analyseInputs(inputs, vocabulary);
  if (!analysed.ok) {
    throw new ApiError("INVALID_INPUT", { field: "inputs.jobAd" });
  }
  return analysed.value;
});

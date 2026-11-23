import { analyseInputs } from "@/modules/application";
import { analyseRequestSchema } from "@/modules/application/contracts";
import { aiContextFor, handleCaller } from "@/modules/identity";
import { loadVocabulary } from "@/shared/server/data-files";
import { getDb } from "@/shared/server/db";
import { ApiError } from "@/shared/server/handle";

// A new ad waits for one Keyword request (FR-5b), up to its 90 s limit.
export const maxDuration = 120;

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// FR-4, FR-5, FR-5b, FR-7: scores the CV against the Job ad with ordinary code
// and returns `{ result, fingerprint }`. The Keyword list of a new ad may come
// from one AI request that carries the Job ad only, never the CV (FR-26), and
// is saved by the ad's hash; the CV is scored by code. A client fingerprint is
// ignored in phase 1. With accounts on the caller is the session's Student and
// the consent is the one on the Profile; with them off, as after Epic 5.
export const POST = handleCaller("/api/analyses", async (request, ctx) => {
  const body = await request.json().catch(() => undefined);
  const { inputs, consent } = analyseRequestSchema.parse(body);

  const vocabulary = await loadVocabulary();
  const analysed = await analyseInputs(inputs, vocabulary, {
    ai: { ctx: await aiContextFor(ctx.session, consent, await getDb()) },
  });
  if (!analysed.ok) {
    throw new ApiError("INVALID_INPUT", { field: "inputs.jobAd" });
  }
  return analysed.value;
});

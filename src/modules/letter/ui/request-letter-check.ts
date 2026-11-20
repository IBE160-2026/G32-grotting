import type {
  AnalyseRequest,
  AnalyseResponse,
  AnalysisInputs,
} from "@/modules/application/contracts";
import { type ApiResult, callApi } from "@/shared/ui/api-client";
import {
  type CheckGap,
  type Letter,
  type LetterCheck,
  type LetterCheckRequest,
  letterCheckSchema,
} from "../contracts";
import { browserLetterIo, type LetterIo } from "./request-letter";

// What the check needs of the job: the same inputs and fingerprint as the
// Letter request (AD-6).
export type LetterCheckJob = {
  readonly applicationId: string;
  readonly inputs: AnalysisInputs;
  readonly fingerprint: string;
  // Only for the silent phase-1 rerun after ANALYSIS_STALE: the check itself
  // asks no AI.
  readonly consent?: AnalyseRequest["consent"];
  // The Gap analysis the check may lean on (FR-11) and its rev: `null` and 0
  // when it failed or is off. The owner sends them once the Gaps have settled.
  readonly gaps?: readonly CheckGap[] | null;
  readonly gapsRev?: number;
};

// How the request reaches the server; tests give their own.
export type LetterCheckIo = {
  sendCheck(body: LetterCheckRequest): Promise<ApiResult<LetterCheck>>;
  analyse: LetterIo["analyse"];
};

export const browserLetterCheckIo: LetterCheckIo = {
  sendCheck: (body) =>
    callApi(
      `/api/analyses/${body.applicationId}/letter-check`,
      letterCheckSchema,
      {
        body,
      },
    ),
  analyse: browserLetterIo.analyse,
};

export type LetterCheckOutcome = {
  readonly answer: ApiResult<LetterCheck>;
  // Set when phase 1 was rerun because of ANALYSIS_STALE: the owner replaces
  // the result and the fingerprint it holds with these, without a message.
  readonly rerun?: AnalyseResponse;
};

// Only what the check reads goes over the wire: no explanation, no suggestion.
function forWire(gaps: readonly CheckGap[]): CheckGap[] {
  return gaps.map(({ keyword, kind, citation }) => ({
    keyword,
    kind,
    citation,
  }));
}

/**
 * One integrity check of a Letter (FR-11, AD-6) with the Gap analysis that
 * stands beside it (or none). Like `requestLetter`:
 * `ANALYSIS_STALE` reruns phase 1 once and sends the check again with the new
 * fingerprint; a second one is the answer, so it never loops. It is no AI
 * request: no consent, no cap.
 */
export async function requestLetterCheck(
  job: LetterCheckJob,
  letter: Letter,
  io: LetterCheckIo = browserLetterCheckIo,
): Promise<LetterCheckOutcome> {
  const gaps =
    job.gaps === undefined || job.gaps === null ? null : forWire(job.gaps);
  const send = (fingerprint: string) =>
    io.sendCheck({
      applicationId: job.applicationId,
      fingerprint,
      inputs: job.inputs,
      letter,
      gaps,
      letterRev: letter.rev,
      gapsRev: job.gapsRev ?? 0,
    });

  const first = await send(job.fingerprint);
  if (first.ok || first.error.code !== "ANALYSIS_STALE") {
    return { answer: first };
  }
  const rerun = await io.analyse({
    applicationId: job.applicationId,
    inputs: job.inputs,
    consent: job.consent ?? null,
  });
  if (!rerun.ok) return { answer: rerun };
  return { answer: await send(rerun.data.fingerprint), rerun: rerun.data };
}

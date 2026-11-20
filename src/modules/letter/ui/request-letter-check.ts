import type {
  AnalyseRequest,
  AnalyseResponse,
  AnalysisInputs,
} from "@/modules/application/contracts";
import { type ApiResult, callApi } from "@/shared/ui/api-client";
import {
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

// Gap analysis does not exist before Epic 4: `gaps` is null and its rev is 0.
const NO_GAPS_REV = 0;

/**
 * One integrity check of a Letter (FR-11, AD-6). Like `requestLetter`:
 * `ANALYSIS_STALE` reruns phase 1 once and sends the check again with the new
 * fingerprint; a second one is the answer, so it never loops. It is no AI
 * request: no consent, no cap.
 */
export async function requestLetterCheck(
  job: LetterCheckJob,
  letter: Letter,
  io: LetterCheckIo = browserLetterCheckIo,
): Promise<LetterCheckOutcome> {
  const send = (fingerprint: string) =>
    io.sendCheck({
      applicationId: job.applicationId,
      fingerprint,
      inputs: job.inputs,
      letter,
      gaps: null,
      letterRev: letter.rev,
      gapsRev: NO_GAPS_REV,
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

import {
  type AnalyseRequest,
  type AnalyseResponse,
  type AnalysisInputs,
  analyseResponseSchema,
} from "@/modules/application/contracts";
import { type ApiResult, callApi } from "@/shared/ui/api-client";
import {
  type GapsRequest,
  type GapsResponse,
  gapsResponseSchema,
} from "../contracts";

// As the Letter: the server's own limit is 90 s, the browser waits a little
// longer so the answer the server gives (AI_TIMEOUT) is the one the Student
// gets.
export const GAPS_TIMEOUT_MS = 105_000;

export type GapsJob = {
  readonly applicationId: string;
  readonly inputs: AnalysisInputs;
  // The fingerprint phase 1 answered with (AD-6).
  readonly fingerprint: string;
};

// How the request reaches the server; tests give their own.
export type GapsIo = {
  sendGaps(body: GapsRequest): Promise<ApiResult<GapsResponse>>;
  analyse(body: AnalyseRequest): Promise<ApiResult<AnalyseResponse>>;
};

export const browserGapsIo: GapsIo = {
  sendGaps: (body) =>
    callApi(`/api/analyses/${body.applicationId}/gaps`, gapsResponseSchema, {
      body,
      timeoutMs: GAPS_TIMEOUT_MS,
    }),
  analyse: (body) => callApi("/api/analyses", analyseResponseSchema, { body }),
};

export type GapsOutcome = {
  readonly answer: ApiResult<GapsResponse>;
  // Set when phase 1 was rerun because of ANALYSIS_STALE: the owner replaces
  // the result and the fingerprint it holds with these, without a message.
  readonly rerun?: AnalyseResponse;
};

/**
 * One phase-2 Gaps request (FR-13, AD-6): inputs, fingerprint and consent.
 * `ANALYSIS_STALE` reruns phase 1 once and sends the request again with the new
 * fingerprint; a second one is the answer (the section error), so it never
 * loops. An answer for an earlier submission (`isCurrent` false) is not
 * followed up: no rerun and no resend, since each one counts toward the cap.
 */
export async function requestGaps(
  job: GapsJob,
  consent: GapsRequest["consent"],
  io: GapsIo = browserGapsIo,
  // False once a new submission has started: nothing more is sent for this one.
  isCurrent: () => boolean = () => true,
): Promise<GapsOutcome> {
  const send = (fingerprint: string) =>
    io.sendGaps({
      applicationId: job.applicationId,
      fingerprint,
      inputs: job.inputs,
      consent,
    });

  const first = await send(job.fingerprint);
  if (first.ok || first.error.code !== "ANALYSIS_STALE" || !isCurrent()) {
    return { answer: first };
  }
  const rerun = await io.analyse({
    applicationId: job.applicationId,
    inputs: job.inputs,
    consent,
  });
  if (!rerun.ok) return { answer: rerun };
  // A new submission started while phase 1 reran: this one is no longer asked.
  if (!isCurrent()) return { answer: first };
  return { answer: await send(rerun.data.fingerprint), rerun: rerun.data };
}

import {
  type AnalyseRequest,
  type AnalyseResponse,
  type AnalysisInputs,
  analyseResponseSchema,
} from "@/modules/application/contracts";
import { type ApiResult, callApi } from "@/shared/ui/api-client";
import {
  type LetterRequest,
  type LetterResponse,
  letterResponseSchema,
  type Tone,
} from "../contracts";

// The server's own limit is 90 s; the browser waits a little longer, so the
// answer the server gives (AI_TIMEOUT) is the one the Student gets.
export const LETTER_TIMEOUT_MS = 105_000;

export type LetterJob = {
  readonly applicationId: string;
  readonly inputs: AnalysisInputs;
  readonly tone: Tone;
  // The fingerprint phase 1 answered with (AD-6).
  readonly fingerprint: string;
  // The rev of the Letter now shown; «Lag nytt utkast» sends it so the server
  // answers with the next one. 0 for the first draft.
  readonly previousRev?: number;
};

// How the request reaches the server; tests give their own.
export type LetterIo = {
  sendLetter(body: LetterRequest): Promise<ApiResult<LetterResponse>>;
  analyse(body: AnalyseRequest): Promise<ApiResult<AnalyseResponse>>;
};

export const browserLetterIo: LetterIo = {
  sendLetter: (body) =>
    callApi(
      `/api/analyses/${body.applicationId}/letter`,
      letterResponseSchema,
      {
        body,
        timeoutMs: LETTER_TIMEOUT_MS,
      },
    ),
  analyse: (body) => callApi("/api/analyses", analyseResponseSchema, { body }),
};

export type LetterOutcome = {
  readonly answer: ApiResult<LetterResponse>;
  // Set when phase 1 was rerun because of ANALYSIS_STALE: the owner replaces
  // the result and the fingerprint it holds with these, without a message.
  readonly rerun?: AnalyseResponse;
};

/**
 * One phase-2 Letter request (FR-9, FR-10, AD-6): inputs, fingerprint, Tone and
 * consent. `ANALYSIS_STALE` reruns phase 1 once and sends the Letter request
 * again with the new fingerprint; a second one is the answer (the section
 * error), so it never loops. An answer for an earlier submission (`isCurrent`
 * false) is not followed up: no rerun and no resend, since each one counts
 * toward the cap.
 */
export async function requestLetter(
  job: LetterJob,
  consent: LetterRequest["consent"],
  io: LetterIo = browserLetterIo,
  // False once a new submission has started: nothing more is sent for this one.
  isCurrent: () => boolean = () => true,
): Promise<LetterOutcome> {
  const send = (fingerprint: string) =>
    io.sendLetter({
      applicationId: job.applicationId,
      fingerprint,
      inputs: job.inputs,
      tone: job.tone,
      consent,
      previousRev: job.previousRev ?? 0,
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

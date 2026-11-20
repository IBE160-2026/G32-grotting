import { describe, expect, it, vi } from "vitest";
import type { AnalyseResponse } from "@/modules/application/contracts";
import type { ApiResult } from "@/shared/ui/api-client";
import type { Letter, LetterCheck, LetterCheckRequest } from "../contracts";
import {
  type LetterCheckIo,
  type LetterCheckJob,
  requestLetterCheck,
} from "./request-letter-check";

const job: LetterCheckJob = {
  applicationId: "5b8b4a58-1d2c-4f55-9f43-7d1d6f0a1c11",
  inputs: {
    cvText: "cv",
    jobAd: "annonse",
    jobTitle: "Utvikler",
    employer: "Nordic Digital",
  },
  fingerprint: "fp-1",
};
const letter: Letter = { text: "Hei\n\n{{SIGNATUR}}", tone: "Direkte", rev: 3 };

const checked: LetterCheck = {
  flags: [
    {
      kind: "UNSUPPORTED_CLAIM",
      term: "TypeScript",
      word: "TypeScript",
      spans: [{ start: 0, end: 10 }],
    },
  ],
  letterRev: 3,
  gapsRev: 0,
};
const good: ApiResult<LetterCheck> = { ok: true, data: checked };
const stale: ApiResult<LetterCheck> = {
  ok: false,
  error: { code: "ANALYSIS_STALE", retryable: false },
};
const rerun = { result: {}, fingerprint: "fp-2" } as unknown as AnalyseResponse;

function io(
  answers: ApiResult<LetterCheck>[],
  analyse: ApiResult<AnalyseResponse> = { ok: true, data: rerun },
) {
  const sent: LetterCheckRequest[] = [];
  const queue = [...answers];
  const analyseMock = vi.fn(async () => analyse);
  const port: LetterCheckIo = {
    sendCheck: async (body) => {
      sent.push(body);
      const next = queue.shift();
      if (next === undefined) throw new Error("unexpected request");
      return next;
    },
    analyse: analyseMock,
  };
  return { port, sent, analyseMock };
}

describe("FR-11 the Letter check request", () => {
  it("sends the inputs, fingerprint, Letter, null gaps and the revs in one request, with no consent", async () => {
    const { port, sent } = io([good]);
    const outcome = await requestLetterCheck(job, letter, port);
    expect(outcome).toEqual({ answer: good });
    expect(sent).toEqual([
      {
        applicationId: job.applicationId,
        fingerprint: "fp-1",
        inputs: job.inputs,
        letter,
        gaps: null,
        letterRev: 3,
        gapsRev: 0,
      },
    ]);
    expect(sent[0]).not.toHaveProperty("consent");
  });

  it("passes any other failure on without a second request", async () => {
    const failure: ApiResult<LetterCheck> = {
      ok: false,
      error: { code: "NETWORK_ERROR", retryable: true },
    };
    const { port, sent, analyseMock } = io([failure]);
    expect(await requestLetterCheck(job, letter, port)).toEqual({
      answer: failure,
    });
    expect(sent).toHaveLength(1);
    expect(analyseMock).not.toHaveBeenCalled();
  });
});

describe("AD-6 ANALYSIS_STALE for the check", () => {
  it("reruns phase 1 once and resends with the new fingerprint", async () => {
    const { port, sent, analyseMock } = io([stale, good]);
    const outcome = await requestLetterCheck(job, letter, port);
    expect(outcome).toEqual({ answer: good, rerun });
    expect(analyseMock).toHaveBeenCalledTimes(1);
    expect(analyseMock).toHaveBeenCalledWith({
      applicationId: job.applicationId,
      inputs: job.inputs,
      consent: null,
    });
    expect(sent.map((body) => body.fingerprint)).toEqual(["fp-1", "fp-2"]);
  });

  it("FR-5b sends the job's consent with the silent phase-1 rerun", async () => {
    const { port, analyseMock } = io([stale, good]);
    const consent = { noticeVersion: "notice-3:openrouter:unknown:fallback" };
    await requestLetterCheck({ ...job, consent }, letter, port);
    expect(analyseMock).toHaveBeenCalledWith({
      applicationId: job.applicationId,
      inputs: job.inputs,
      consent,
    });
  });

  it("answers with the second ANALYSIS_STALE instead of looping", async () => {
    const { port, sent, analyseMock } = io([stale, stale]);
    const outcome = await requestLetterCheck(job, letter, port);
    expect(outcome.answer).toEqual(stale);
    expect(sent).toHaveLength(2);
    expect(analyseMock).toHaveBeenCalledTimes(1);
  });

  it("answers with the failure when the rerun of phase 1 fails", async () => {
    const failed: ApiResult<AnalyseResponse> = {
      ok: false,
      error: { code: "NETWORK_ERROR", retryable: true },
    };
    const { port, sent } = io([stale], failed);
    expect(await requestLetterCheck(job, letter, port)).toEqual({
      answer: failed,
    });
    expect(sent).toHaveLength(1);
  });
});

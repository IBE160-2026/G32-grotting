import { describe, expect, it, vi } from "vitest";
import type { AnalyseResponse } from "@/modules/application/contracts";
import type { ApiResult } from "@/shared/ui/api-client";
import type { LetterRequest, LetterResponse } from "../contracts";
import { type LetterIo, type LetterJob, requestLetter } from "./request-letter";

const job: LetterJob = {
  applicationId: "5b8b4a58-1d2c-4f55-9f43-7d1d6f0a1c11",
  inputs: {
    cvText: "cv",
    jobAd: "annonse",
    jobTitle: "Utvikler",
    employer: "Nordic Digital",
  },
  tone: "Direkte",
  fingerprint: "fp-1",
};

const letter: LetterResponse = {
  letter: { text: "Hei\n\n{{SIGNATUR}}", tone: "Direkte", rev: 1 },
  meta: {
    source: "cached",
    provider: "p",
    model: "m",
    promptVersion: "letter-1",
    createdAt: "2026-11-19T10:00:00.000Z",
  },
};
const good: ApiResult<LetterResponse> = { ok: true, data: letter };
const stale: ApiResult<LetterResponse> = {
  ok: false,
  error: { code: "ANALYSIS_STALE", retryable: false },
};
const rerun = { result: {}, fingerprint: "fp-2" } as unknown as AnalyseResponse;

function io(
  answers: ApiResult<LetterResponse>[],
  analyse: ApiResult<AnalyseResponse> = { ok: true, data: rerun },
) {
  const sent: LetterRequest[] = [];
  const queue = [...answers];
  const analyseMock = vi.fn(async () => analyse);
  const port: LetterIo = {
    sendLetter: async (body) => {
      sent.push(body);
      const next = queue.shift();
      if (next === undefined) throw new Error("unexpected request");
      return next;
    },
    analyse: analyseMock,
  };
  return { port, sent, analyseMock };
}

describe("FR-9, FR-10 the phase-2 Letter request", () => {
  it("sends the inputs, fingerprint, Tone and consent in one request", async () => {
    const { port, sent } = io([good]);
    const consent = {
      noticeVersion: "notice-2:openrouter:unknown:no-fallback",
    };
    const outcome = await requestLetter(job, consent, port);
    expect(outcome).toEqual({ answer: good });
    expect(sent).toEqual([
      {
        applicationId: job.applicationId,
        fingerprint: "fp-1",
        inputs: job.inputs,
        tone: "Direkte",
        consent,
        previousRev: 0,
      },
    ]);
  });

  it("sends consent null when the notice has not been accepted", async () => {
    const { port, sent } = io([good]);
    await requestLetter(job, null, port);
    expect(sent[0]?.consent).toBeNull();
  });

  it("passes any other failure on without a second request", async () => {
    const failure: ApiResult<LetterResponse> = {
      ok: false,
      error: { code: "AI_TIMEOUT", retryable: true },
    };
    const { port, sent, analyseMock } = io([failure]);
    expect(await requestLetter(job, null, port)).toEqual({ answer: failure });
    expect(sent).toHaveLength(1);
    expect(analyseMock).not.toHaveBeenCalled();
  });
});

describe("AD-6 ANALYSIS_STALE", () => {
  it("reruns phase 1 once and resends with the new fingerprint", async () => {
    const { port, sent, analyseMock } = io([stale, good]);
    const outcome = await requestLetter(job, null, port);
    expect(outcome).toEqual({ answer: good, rerun });
    expect(analyseMock).toHaveBeenCalledTimes(1);
    expect(analyseMock).toHaveBeenCalledWith({
      applicationId: job.applicationId,
      inputs: job.inputs,
    });
    expect(sent.map((body) => body.fingerprint)).toEqual(["fp-1", "fp-2"]);
  });

  it("answers with the second ANALYSIS_STALE instead of looping", async () => {
    const { port, sent, analyseMock } = io([stale, stale]);
    const outcome = await requestLetter(job, null, port);
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
    const outcome = await requestLetter(job, null, port);
    expect(outcome).toEqual({ answer: failed });
    expect(sent).toHaveLength(1);
  });
});

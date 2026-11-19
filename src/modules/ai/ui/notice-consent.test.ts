import { describe, expect, it } from "vitest";
import type { RunMode } from "@/shared/ui/run-mode";
import { consentFor, noticeRequired } from "./notice-consent";

const run = (testMode: boolean, version = "notice-2:openrouter:unknown:x") =>
  ({
    testMode,
    aiNotice: { version, providerName: "openrouter", retentionDays: null },
  }) satisfies Pick<RunMode, "testMode" | "aiNotice">;

describe("FR-24 when the AI notice is asked for", () => {
  it("asks when live and nothing was accepted in this session", () => {
    expect(noticeRequired(run(false), undefined)).toBe(true);
  });

  it("asks again when the accepted version is not the one showing", () => {
    expect(noticeRequired(run(false), "notice-1:old")).toBe(true);
  });

  it("does not ask when the showing version was accepted", () => {
    const { aiNotice } = run(false);
    expect(noticeRequired(run(false), aiNotice.version)).toBe(false);
  });

  it("never asks in Test mode", () => {
    expect(noticeRequired(run(true), undefined)).toBe(false);
    expect(noticeRequired(run(true), "anything")).toBe(false);
  });
});

describe("FR-24, AD-13 the consent a phase-2 request carries", () => {
  it("carries the accepted version when it is the one showing", () => {
    const { aiNotice } = run(false);
    expect(consentFor(run(false), aiNotice.version)).toEqual({
      noticeVersion: aiNotice.version,
    });
  });

  it("carries nothing when nothing, or an older version, was accepted", () => {
    expect(consentFor(run(false), undefined)).toBeNull();
    expect(consentFor(run(false), "notice-1:old")).toBeNull();
  });
});

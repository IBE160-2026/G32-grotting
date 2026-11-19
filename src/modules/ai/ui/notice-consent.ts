import type { RunMode } from "@/shared/ui/run-mode";
import type { AiConsent } from "../contracts";

type NoticeConfig = Pick<RunMode, "testMode" | "aiNotice">;

// The notice is asked for when text could leave the app and this browser
// session has not accepted the version that is showing (FR-24, AD-16). Test
// mode never sends text, so it never asks.
export function noticeRequired(
  run: NoticeConfig,
  accepted: string | undefined,
): boolean {
  return !run.testMode && accepted !== run.aiNotice.version;
}

// What a phase-2 request carries (AD-13): the accepted version, or nothing
// when the Student has not accepted the version that is showing. In Test mode
// the server skips the check, but the version is still sent when it is there.
export function consentFor(
  run: Pick<RunMode, "aiNotice">,
  accepted: string | undefined,
): AiConsent | null {
  return accepted === run.aiNotice.version ? { noticeVersion: accepted } : null;
}

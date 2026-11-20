import { messages } from "@/shared/ui/messages.nb";
import type { AnalysisResult } from "../contracts";
import { verdictOf } from "../core/score";

/**
 * The line the first live region speaks when the score renders: the score
 * sentence and the Verdict, once (NFR-2). The Verdict is derived here from the
 * score, as in the score block. With `aiNext` the line ends with what happens
 * next: the Letter is being written (UX-DR33, before S4).
 */
export function phaseOneLine(result: AnalysisResult, aiNext = false): string {
  const line = messages.result.live(
    result.score,
    messages.result.verdict[verdictOf(result.score)],
    result.matchedCount,
    result.totalCount,
  );
  return aiNext ? `${line} ${messages.result.liveAiNext}` : line;
}

/**
 * The line for a result that replaced the one on screen after a silent rerun
 * of phase 1 (AD-6): the new score and Verdict, spoken in the second region.
 */
export function updatedLine(result: AnalysisResult): string {
  return messages.result.liveUpdated(
    result.score,
    messages.result.verdict[verdictOf(result.score)],
    result.matchedCount,
    result.totalCount,
  );
}

const terms = (entries: readonly { term: string }[]) =>
  JSON.stringify(entries.map(({ term }) => term));

/** True when the Student would see a difference: the score or a keyword list. */
export function resultChanged(
  before: AnalysisResult,
  after: AnalysisResult,
): boolean {
  return (
    before.score !== after.score ||
    before.matchedCount !== after.matchedCount ||
    before.totalCount !== after.totalCount ||
    terms(before.matched) !== terms(after.matched) ||
    terms(before.missing) !== terms(after.missing)
  );
}

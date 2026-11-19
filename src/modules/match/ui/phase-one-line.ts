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

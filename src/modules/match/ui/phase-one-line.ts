import { messages } from "@/shared/ui/messages.nb";
import type { AnalysisResult } from "../contracts";
import { verdictOf } from "../core/score";

/**
 * The line the first live region speaks when the score renders: the score
 * sentence and the Verdict, once (NFR-2). The Verdict is derived here from the
 * score, as in the score block.
 */
export function phaseOneLine(result: AnalysisResult): string {
  return messages.result.live(
    result.score,
    messages.result.verdict[verdictOf(result.score)],
    result.matchedCount,
    result.totalCount,
  );
}

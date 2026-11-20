import { CodeStrip } from "@/shared/ui/components/code-strip";
import { messages } from "@/shared/ui/messages.nb";
import type { AnalysisResult } from "../contracts";
import { verdictOf } from "../core/score";

// The score sentence, the Verdict with its threshold sentence, the formula and
// the disclaimer, together (UX-DR12). The Verdict is derived from the score
// here and never read from the wire (AD-7).
export function ScoreBlock({ result }: { result: AnalysisResult }) {
  const { score, matchedCount, totalCount, formula } = result;
  const verdict = verdictOf(score);
  const { matched, total } =
    formula.key === "MATCH_FORMULA"
      ? formula.params
      : { matched: matchedCount, total: totalCount };

  return (
    <section
      aria-labelledby="score-heading"
      className="grid grid-cols-2 border-rule border-y max-640:grid-cols-1"
    >
      <div className="flex flex-col items-start gap-4 py-6 pr-6 max-640:pr-0">
        <h2
          id="score-heading"
          className="text-score max-640:text-score-mobile tabular-nums"
        >
          {messages.result.score(score, matchedCount, totalCount)}
        </h2>
        <CodeStrip kind={verdict === "strong" ? "found" : "outline"}>
          {messages.result.verdict[verdict]}
        </CodeStrip>
        <p className="text-body text-ink-2">
          {messages.result.threshold[verdict]}
        </p>
      </div>
      <div className="flex flex-col gap-3 border-rule border-l py-6 pl-6 max-640:border-t max-640:border-l-0 max-640:pl-0">
        <p className="caps text-ink-2">{messages.result.formulaLabel}</p>
        <p className="font-mono text-mono-formula text-ink tabular-nums">
          {messages.result.formula(matched, total, score)}
        </p>
        <p className="text-hint text-ink-2">{messages.result.disclaimer}</p>
        {result.keywordSource === "code-fallback" ? (
          <p className="m-0 border border-edge px-4 py-3 text-body text-ink">
            {messages.result.lessPrecise}
          </p>
        ) : null}
      </div>
    </section>
  );
}

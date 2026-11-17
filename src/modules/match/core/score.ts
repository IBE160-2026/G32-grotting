export type Verdict = "strong" | "needs-work";

export const STRONG_FROM = 70;

/**
 * The Match score: Matched Keywords as a share of all Keywords, rounded to a
 * whole number 0 to 100, equal weight per Keyword (FR-7).
 */
export function scoreOf(matched: number, total: number): number {
  if (total === 0) throw new RangeError("scoreOf: total must not be 0");
  return Math.round((100 * matched) / total);
}

/**
 * The Verdict, judged on the rounded score (FR-7). Never sent or stored: the
 * UI derives it from the score.
 */
export function verdictOf(score: number): Verdict {
  return score >= STRONG_FROM ? "strong" : "needs-work";
}

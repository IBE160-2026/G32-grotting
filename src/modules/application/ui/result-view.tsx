"use client";

import type { RefObject } from "react";
import { GapsSection } from "@/modules/gaps/ui";
import type { LetterJob } from "@/modules/letter/ui";
import { LetterSection } from "@/modules/letter/ui";
import type { AnalysisResult } from "@/modules/match/contracts";
import { KeywordList, PulsePlot, ScoreBlock } from "@/modules/match/ui";
import { formatCount } from "@/shared/core/format-count";
import { Button } from "@/shared/ui/components/button";
import { CatalogueHeading } from "@/shared/ui/components/catalogue-heading";
import { CreditsList } from "@/shared/ui/components/credits-list";
import { ProgressLine } from "@/shared/ui/components/progress-line";
import { messages } from "@/shared/ui/messages.nb";
import type { PhaseTwo } from "./use-phase-two";

// What the result view shows, kept as it was submitted: the form can change
// only after «Endre annonsen» has brought it back. Held in the form component
// only, never stored (AD-8).
export type Outcome = {
  readonly result: AnalysisResult;
  // What phase 2 needs to ask for the Letter again.
  readonly job: LetterJob;
  readonly jobTitle: string;
  readonly employer: string;
  readonly date: string;
  readonly adParagraphs: readonly string[];
};

type ResultViewProps = {
  readonly outcome: Outcome;
  readonly phaseTwo: PhaseTwo;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  // «Endre annonsen»
  readonly onBack: () => void;
  // The Profile name that signs the Letter (accounts on), else null.
  readonly name?: string | null;
};

/** The result of phase 1 with the Letter and the Gap analysis of phase 2. */
export function ResultView({
  outcome,
  phaseTwo,
  headingRef,
  onBack,
  name = null,
}: ResultViewProps) {
  const { result } = outcome;
  const { letterPhase, gapsPhase } = phaseTwo;
  const letterPending = (letterPhase?.kind ?? "pending") === "pending";

  // The Letter section; with the Gap analysis one progress line stands above
  // both sections, so the Letter's own is left out.
  const letterSection = (showProgress: boolean) => (
    <LetterSection
      phase={letterPhase ?? { kind: "pending" }}
      onRetry={phaseTwo.retryLetter}
      headingRef={phaseTwo.letterHeadingRef}
      employer={outcome.employer}
      regen={phaseTwo.regen}
      onRegenerate={phaseTwo.regenerate}
      check={phaseTwo.letterCheck}
      onRetryCheck={phaseTwo.retryCheck}
      showProgress={showProgress}
      name={name}
    />
  );

  return (
    <>
      <div className="max-w-measure">
        <CatalogueHeading ref={headingRef} employer>
          {outcome.employer}
        </CatalogueHeading>
        <div className="mt-6 flex flex-col gap-8">
          <CreditsList
            items={[
              {
                term: messages.result.credits.position,
                value: outcome.jobTitle,
              },
              { term: messages.result.credits.date, value: outcome.date },
              ...(letterPhase?.kind === "done"
                ? [
                    {
                      term: messages.result.credits.tone,
                      value:
                        messages.tone.options[letterPhase.letter.tone].name,
                    },
                  ]
                : []),
              {
                term: messages.result.credits.ad,
                value: messages.result.adSummary(
                  formatCount(result.adParagraphs),
                  formatCount(result.totalCount),
                ),
              },
            ]}
          />
          <div>
            <Button variant="secondary" onClick={onBack}>
              {messages.result.editAd}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <PulsePlot
          placement="result"
          paragraphs={outcome.adParagraphs}
          matched={result.matched}
          missing={result.missing}
        />
      </div>
      <div className="mt-8 flex max-w-measure flex-col gap-8">
        <ScoreBlock result={result} />
        <KeywordList
          kind="matched"
          entries={result.matched}
          adParagraphs={outcome.adParagraphs}
        />
        <KeywordList
          kind="missing"
          entries={result.missing}
          adParagraphs={outcome.adParagraphs}
          gapTargets={phaseTwo.gapTargets}
        />
      </div>
      <div className="mt-8 max-w-letter">
        {gapsPhase === null ? (
          letterSection(true)
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              {gapsPhase.kind === "pending" || letterPending ? (
                <ProgressLine>
                  {phaseTwo.rewording
                    ? messages.gaps.progressRewording
                    : messages.gaps.progress}
                </ProgressLine>
              ) : null}
              <GapsSection
                phase={gapsPhase}
                onRetry={phaseTwo.retryGaps}
                headingRef={phaseTwo.gapsHeadingRef}
                rewording={phaseTwo.rewording}
              />
            </div>
            {letterSection(false)}
          </div>
        )}
      </div>
    </>
  );
}

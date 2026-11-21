"use client";

import type { ReactNode, Ref } from "react";
import type { MessageKey } from "@/shared/core/message-key";
import { AiPlaceholder } from "@/shared/ui/components/ai-placeholder";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { CodeStrip } from "@/shared/ui/components/code-strip";
import { Notice } from "@/shared/ui/components/notice";
import { messages } from "@/shared/ui/messages.nb";
import type { Gap } from "../contracts";
import { GapEntry } from "./gap-entry";

export const GAPS_HEADING_ID = "gaps-h2";

// Where phase 2 stands for the Gap analysis.
export type GapsPhase =
  | { readonly kind: "pending" }
  | { readonly kind: "done"; readonly gaps: readonly Gap[] }
  | { readonly kind: "failed"; readonly code: MessageKey };

// The «Gapanalyse» section of the result (FR-13, FR-14), an AI section like
// the Letter: the heading is there in every state, and a failure keeps the
// score and the Letter as they are. The progress line belongs to the owner,
// which writes this section and the Letter together.
export function GapsSection({
  phase,
  onRetry,
  headingRef,
  rewording = false,
}: {
  phase: GapsPhase;
  onRetry: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
  // `features.rewording` (FR-16): a Rewordable gap shows its suggestion, or the
  // line that says there is none.
  rewording?: boolean;
}) {
  // `undefined` children keep the slot a placeholder (aria-busy, «Skrives»).
  let settled: ReactNode;
  if (phase.kind === "done") {
    settled = (
      <ul className="m-0 list-none p-0">
        {phase.gaps.map((gap, index) => (
          <GapEntry
            key={gap.keyword}
            gap={gap}
            index={index}
            rewording={rewording}
          />
        ))}
      </ul>
    );
  } else if (phase.kind === "failed") {
    settled = <FailedGaps code={phase.code} onRetry={onRetry} />;
  }
  return (
    <AiPlaceholder
      title={messages.gaps.heading}
      headingId={GAPS_HEADING_ID}
      headingRef={headingRef}
      // `null`, not `undefined`, while the strip is not there: the heading keeps
      // its place in the tree, so focus put on it by «Prøv igjen» survives the
      // change to the settled section.
      strip={
        phase.kind === "done" ? (
          <CodeStrip kind="sand">{messages.gaps.aiStrip}</CodeStrip>
        ) : null
      }
    >
      {settled}
    </AiPlaceholder>
  );
}

function FailedGaps({
  code,
  onRetry,
}: {
  code: MessageKey;
  onRetry: () => void;
}) {
  if (code === "DAILY_CAP_REACHED") {
    return (
      <Notice label={messages.letter.cap.label}>
        {messages.letter.cap.text}
      </Notice>
    );
  }
  if (code === "TEST_MODE_UNAVAILABLE") {
    return (
      <Notice label={messages.letter.testMode.label}>
        {messages.letter.testMode.text}
      </Notice>
    );
  }
  return (
    <div className="flex flex-col items-start gap-4">
      {/* Silent: the live region speaks the failure once (UX-DR39). */}
      <Alert silent>{messages.gaps.failed}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        {messages.gaps.retry}
      </Button>
    </div>
  );
}

"use client";

import type { ReactNode, Ref } from "react";
import type { MessageKey } from "@/shared/core/message-key";
import { AiPlaceholder } from "@/shared/ui/components/ai-placeholder";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { Notice } from "@/shared/ui/components/notice";
import { ProgressLine } from "@/shared/ui/components/progress-line";
import { messages } from "@/shared/ui/messages.nb";
import type { Letter } from "../contracts";
import { LETTER_HEADING_ID, LetterView } from "./letter-view";

// Where phase 2 stands for the Letter.
export type LetterPhase =
  | { readonly kind: "pending" }
  | { readonly kind: "done"; readonly letter: Letter }
  | { readonly kind: "failed"; readonly code: MessageKey };

// The phase-2 line for a settled phase, spoken once in the first live region.
export function letterLine(phase: LetterPhase): string | null {
  if (phase.kind === "pending") return null;
  if (phase.kind === "done") return messages.letter.live.done;
  if (phase.code === "DAILY_CAP_REACHED") return messages.letter.live.cap;
  if (phase.code === "TEST_MODE_UNAVAILABLE") {
    return messages.letter.live.testMode;
  }
  return messages.letter.live.failed;
}

// The «Søknadsbrev» section of the result (before S4: the one AI section). The
// heading is there in every state. A failure keeps the score on the page and
// holds either a retry (the provider failed) or a notice (the cap, Test mode);
// the full failure design is Story 3.9.
export function LetterSection({
  phase,
  onRetry,
  headingRef,
}: {
  phase: LetterPhase;
  onRetry: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  // `undefined` children keep the slot a placeholder (aria-busy, «Skrives»).
  let settled: ReactNode;
  if (phase.kind === "done") settled = <LetterView letter={phase.letter} />;
  else if (phase.kind === "failed") {
    settled = <FailedLetter code={phase.code} onRetry={onRetry} />;
  }
  return (
    <div className="flex flex-col gap-4">
      {phase.kind === "pending" ? (
        <ProgressLine>{messages.letter.progress}</ProgressLine>
      ) : null}
      <AiPlaceholder
        title={messages.letter.heading}
        headingId={LETTER_HEADING_ID}
        headingRef={headingRef}
      >
        {settled}
      </AiPlaceholder>
    </div>
  );
}

function FailedLetter({
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
      <Alert>{messages.letter.failed}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        {messages.letter.retry}
      </Button>
    </div>
  );
}

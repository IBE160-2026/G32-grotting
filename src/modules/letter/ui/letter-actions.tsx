"use client";

import { type RefObject, useRef, useState } from "react";
import { announce } from "@/shared/ui/announce";
import { selectContents } from "@/shared/ui/clipboard";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { CopyButton } from "@/shared/ui/components/copy-button";
import { Notice } from "@/shared/ui/components/notice";
import { messages } from "@/shared/ui/messages.nb";
import type { Letter } from "../contracts";
import { renderLetter } from "../core/render-letter";
import { downloadLetter } from "./download-letter";

// Where «Lag nytt utkast» stands (FR-12, UX-DR39).
// `cap` and `testMode` are notices without a retry; `failed` is the alert.
export type RegenState = "idle" | "running" | "failed" | "cap" | "testMode";

/**
 * The action stack under the Letter (FR-12, UX-DR28): «Kopier» (primary),
 * «Last ned (.docx)», «Lag nytt utkast» and the hint. Full width at 640 px or
 * less. While a new draft is written the old Letter stays and the button is
 * busy; a failure keeps the old Letter and offers «Prøv igjen».
 */
export function LetterActions({
  letter,
  employer,
  articleRef,
  regen = "idle",
  onRegenerate,
  name = null,
  readOnly = false,
  year,
}: {
  letter: Letter;
  employer: string;
  articleRef: RefObject<HTMLElement | null>;
  regen?: RegenState;
  onRegenerate?: () => void;
  // The Profile name (accounts on): in the copy, the file and its name.
  name?: string | null;
  // A reopened Application (Story 6.9): «Kopier» and «Last ned (.docx)» only,
  // with no «Lag nytt utkast», no regenerate alert or notice.
  readOnly?: boolean;
  // The year in the file name; the year of the Application when it is reopened.
  year?: number;
}) {
  const regenerateRef = useRef<HTMLButtonElement>(null);
  const [downloading, setDownloading] = useState(false);
  // The rev of the Letter whose download failed, so a new draft starts clean.
  const [failedRev, setFailedRev] = useState<number | null>(null);
  const downloadFailed = failedRev === letter.rev;
  const rendered = renderLetter(letter.text, name);

  async function download() {
    if (downloading) return;
    setDownloading(true);
    setFailedRev(null);
    try {
      await downloadLetter(letter.text, employer, name, year);
    } catch {
      setFailedRev(letter.rev);
      announce("action", messages.letter.actions.downloadFailed);
    } finally {
      setDownloading(false);
    }
  }

  // The retry button goes away as the request starts, so focus moves to the
  // button that stays (and is busy).
  function retry() {
    onRegenerate?.();
    regenerateRef.current?.focus();
  }

  return (
    <div className="mt-6 flex max-w-letter flex-col items-start gap-3 max-640:items-stretch">
      {!readOnly && regen === "failed" ? (
        <div className="flex flex-col items-start gap-3 max-640:items-stretch">
          {/* Silent: the second live region speaks it once (UX-DR39). */}
          <Alert silent>{messages.letter.regenerate.live.failed}</Alert>
          <Button variant="secondary" onClick={retry}>
            {messages.letter.retry}
          </Button>
        </div>
      ) : null}
      {!readOnly && regen === "cap" ? (
        <Notice label={messages.letter.cap.label}>
          {messages.letter.cap.text}
        </Notice>
      ) : null}
      {!readOnly && regen === "testMode" ? (
        <Notice label={messages.letter.testMode.label}>
          {messages.letter.testMode.text}
        </Notice>
      ) : null}
      {downloadFailed ? (
        <Alert silent>{messages.letter.actions.downloadFailed}</Alert>
      ) : null}
      <CopyButton
        text={rendered}
        variant="primary"
        onBlocked={() => selectContents(articleRef.current)}
      />
      <Button variant="secondary" busy={downloading} onClick={download}>
        {messages.letter.actions.download}
      </Button>
      {readOnly ? null : (
        <Button
          ref={regenerateRef}
          variant="secondary"
          busy={regen === "running"}
          onClick={onRegenerate}
        >
          {messages.letter.regenerate.label}
        </Button>
      )}
      <p className="m-0 text-hint text-ink-2">
        {readOnly ? messages.saved.letterHint : messages.letter.actions.hint}
      </p>
    </div>
  );
}

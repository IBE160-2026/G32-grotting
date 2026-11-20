"use client";

import type { RefObject } from "react";
import { Button } from "@/shared/ui/components/button";
import { Dialog } from "@/shared/ui/components/dialog";
import { messages } from "@/shared/ui/messages.nb";
import { useRunMode } from "@/shared/ui/run-mode";

type AiNoticeProps = {
  open: boolean;
  // «Godta og fortsett»: the owner saves the version and starts phase 1.
  onAccept: () => void;
  // «Avbryt» or Esc: nothing is sent, every input stays.
  onCancel: () => void;
  // The submit button; focus returns to it on close.
  returnFocusRef: RefObject<HTMLElement | null>;
};

// The notice shown before any text leaves the app (FR-24, UX-DR17). Names
// OpenRouter and the model host, and says nothing is sent before acceptance.
export function AiNotice({
  open,
  onAccept,
  onCancel,
  returnFocusRef,
}: AiNoticeProps) {
  const { aiNotice, features } = useRunMode();
  const { points } = messages.aiNotice;
  const provider =
    messages.aiNotice.provider[aiNotice.providerName] ?? aiNotice.providerName;
  return (
    <Dialog
      open={open}
      title={messages.aiNotice.title}
      onCancel={onCancel}
      returnFocusRef={returnFocusRef}
    >
      {({ descriptionId }) => (
        <>
          <p id={descriptionId} className="mt-4 mb-0 text-body text-ink">
            {messages.aiNotice.body(provider, messages.aiNotice.host)}
          </p>
          <ul className="m-0 mt-5 list-none p-0 text-body text-ink">
            {[
              points.local,
              points.stripped,
              points.noTraining(
                provider,
                messages.aiNotice.hostShort,
                messages.aiNotice.retention(aiNotice.retentionDays),
              ),
              // The Job ad, never the CV, is sent for Keywords (FR-5b).
              ...(features.keywordFallback ? [points.keywords] : []),
              points.sensitive,
              points.once,
            ].map((point) => (
              <li
                key={point}
                className="border-t border-rule py-3 last:border-b"
              >
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={onAccept}>{messages.aiNotice.accept}</Button>
            <Button variant="secondary" onClick={onCancel}>
              {messages.aiNotice.cancel}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
